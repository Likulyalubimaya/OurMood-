// ================================
// FIREBASE
// ================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

import {
    getAuth,
    signInAnonymously,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteField,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";


// ================================
// ТВОЙ FIREBASE CONFIG
// ================================

// ВСТАВЬ СЮДА СВОЙ firebaseConfig
const firebaseConfig = {
    apiKey: "AIzaSyDqcukb88QN0CcJ3miBMgoine5Pom_YliU",
    authDomain: "ourmood-874e2.firebaseapp.com",
    projectId: "ourmood-874e2",
    storageBucket: "ourmood-874e2.firebasestorage.app",
    messagingSenderId: "998164287763",
    appId: "1:998164287763:web:a4b68645c2bed35f814ae6",
    measurementId: "G-8PLHN9Q3CT"
};


// ================================
// ИНИЦИАЛИЗАЦИЯ
// ================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


// ================================
// TELEGRAM
// ================================

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}


// ================================
// ЭЛЕМЕНТЫ
// ================================

let selectedMood = null;
let currentUser = null;
let currentPairId = null;

const moodButtons = document.querySelectorAll(".mood");
const saveButton = document.getElementById("save-mood");
const message = document.getElementById("message");

const createPairButton = document.getElementById("create-pair");
const joinPairButton = document.getElementById("join-pair");
const sharePairButton = document.getElementById("share-pair");
const leavePairButton = document.getElementById("leave-pair");
const partnerStatus = document.getElementById("partner-status");


// ================================
// ВХОД АНОНИМНО
// ================================

signInAnonymously(auth)
    .catch((error) => {
        console.error("Ошибка авторизации:", error);
        message.textContent = "Не удалось подключиться к Firebase 😔";
    });


onAuthStateChanged(auth, async (user) => {

    if (!user) return;

    currentUser = user;

    console.log("Firebase user:", currentUser.uid);

    // Если пользователь уже состоит в паре
    const savedPairId = localStorage.getItem("ourMoodPairId");

    if (savedPairId) {

    currentPairId = savedPairId;

    sharePairButton.style.display = "block";

    await loadPair(savedPairId);
    listenToPair(savedPairId);

    return;
}

    // Проверяем ссылку-приглашение Telegram
    const startParam =
        tg?.initDataUnsafe?.start_param;

    if (startParam) {

        await joinPairByCode(startParam);
    }
});


// ================================
// НАСТРОЕНИЯ
// ================================

moodButtons.forEach(button => {

    button.addEventListener("click", () => {

        moodButtons.forEach(item => {
            item.classList.remove("selected");
        });

        button.classList.add("selected");

        selectedMood = {
            emoji: button.querySelector("span").textContent,
            text: button.dataset.mood
        };

        message.textContent = "";
    });

});


// ================================
// СОХРАНЕНИЕ НАСТРОЕНИЯ
// ================================

saveButton.addEventListener("click", async () => {

    if (!selectedMood) {
        message.textContent = "Сначала выбери настроение 💜";
        return;
    }

    if (!currentUser) {
        message.textContent = "Подключаемся к серверу...";
        return;
    }

    if (!currentPairId) {
        message.textContent = "Сначала создай или подключи пару 💌";
        return;
    }

    try {

        const pairRef = doc(db, "pairs", currentPairId);

        await updateDoc(pairRef, {
            [`members.${currentUser.uid}.mood`]: selectedMood,
            [`members.${currentUser.uid}.updatedAt`]: Date.now()
        });

        localStorage.setItem(
            "ourMood",
            JSON.stringify(selectedMood)
        );

        message.textContent =
            `${selectedMood.emoji} Твоё настроение: ${selectedMood.text}`;

    } catch (error) {

        console.error(error);

        message.textContent =
            "Не удалось сохранить настроение 😔";
    }

});


// ================================
// СОЗДАНИЕ ПАРЫ
// ================================

createPairButton.addEventListener("click", async () => {

    if (!currentUser) {
        alert("Подключаемся к серверу...");
        return;
    }

    try {

        // Генерируем короткий код
        const pairCode = generatePairCode();

        const pairRef = doc(db, "pairs", pairCode);

        await setDoc(pairRef, {

            code: pairCode,

            members: {
                [currentUser.uid]: {
                    mood: null,
                    updatedAt: Date.now()
                }
            },

            createdAt: Date.now()

        });

        currentPairId = pairCode;

        localStorage.setItem(
            "ourMoodPairId",
            pairCode
        );

        alert(
            `Ваша пара создана! 💜\n\nКод для партнёра:\n${pairCode}`
        );

        partnerStatus.textContent =
            `Код пары: ${pairCode}`;
        sharePairButton.style.display = "block";

        listenToPair(pairCode);

    } catch (error) {

        console.error(error);

        alert("Не удалось создать пару 😔");
    }

});


// ================================
// ПОДКЛЮЧЕНИЕ К ПАРТНЁРУ
// ================================

joinPairButton.addEventListener("click", async () => {

    const code = prompt(
        "Введите код пары 💌"
    );

    if (!code) return;

    await joinPairByCode(code);
});

joinPairButton.addEventListener("click", async () => {

    const code = prompt(
        "Введите код пары 💌"
    );

    if (!code) return;

    await joinPairByCode(code);
});

async function joinPairByCode(pairCode) {

    if (!currentUser) {
        alert("Подключаемся к серверу...");
        return;
    }

    pairCode = pairCode.trim().toUpperCase();

    try {

        const pairRef = doc(db, "pairs", pairCode);
        const pairSnapshot = await getDoc(pairRef);

        if (!pairSnapshot.exists()) {
            alert("Такой пары не существует 😔");
            return;
        }

        const pairData = pairSnapshot.data();
        const members = pairData.members || {};
        const memberIds = Object.keys(members);

        // Если пользователь уже в этой паре
        if (members[currentUser.uid]) {

            currentPairId = pairCode;

            localStorage.setItem(
                "ourMoodPairId",
                pairCode
            );

            partnerStatus.textContent =
                "Вы подключены 💜";

            sharePairButton.style.display = "block";

            listenToPair(pairCode);

            return;
        }

        // В паре уже два человека
        if (memberIds.length >= 2) {

            alert(
                "В этой паре уже есть два человека 💜"
            );

            return;
        }

        // Добавляем нового участника
        await updateDoc(pairRef, {

            [`members.${currentUser.uid}`]: {
                mood: null,
                updatedAt: Date.now()
            }

        });

        currentPairId = pairCode;

        localStorage.setItem(
            "ourMoodPairId",
            pairCode
        );

        partnerStatus.textContent =
            "Вы подключены 💜";

        sharePairButton.style.display = "block";

        listenToPair(pairCode);

        alert(
            "Вы успешно подключились к партнёру! 💜"
        );

    } catch (error) {

        console.error(
            "Ошибка подключения:",
            error
        );

        alert(
            "Не удалось подключиться к паре 😔"
        );
    }
}


leavePairButton.addEventListener("click", async () => {

    if (!currentUser || !currentPairId) {
        alert("Ты сейчас не состоишь в паре 💜");
        return;
    }

    const confirmed = confirm(
        "Ты точно хочешь покинуть пару? 💔"
    );

    if (!confirmed) return;

    try {

        const pairRef = doc(db, "pairs", currentPairId);

        await updateDoc(pairRef, {
            [`members.${currentUser.uid}`]: deleteField()
        });

        localStorage.removeItem("ourMoodPairId");

        currentPairId = null;

        partnerStatus.textContent =
            "Пока вы не подключены";

        sharePairButton.style.display = "none";

        alert("Ты покинул(а) пару 💜");

    } catch (error) {

        console.error("Ошибка выхода из пары:", error);

        alert("Не удалось покинуть пару 😔");
    }
});


// ================================
// СЛУШАЕМ ИЗМЕНЕНИЯ ПАРЫ
// ================================

function listenToPair(pairId) {

    const pairRef = doc(db, "pairs", pairId);

    onSnapshot(pairRef, (snapshot) => {

        if (!snapshot.exists()) return;

        const data = snapshot.data();

        const members = data.members || {};

        const memberIds = Object.keys(members);

        // Находим партнёра
        const partnerId = memberIds.find(
            id => id !== currentUser.uid
        );

        if (!partnerId) {

            partnerStatus.textContent =
                `Ожидаем партнёра 💌`;

            return;
        }

        partnerStatus.textContent =
            "Вы подключены 💜";

        const partner = members[partnerId];

        if (partner.mood) {

            console.log(
                "Настроение партнёра:",
                partner.mood
            );

            partnerStatus.textContent =
                `${partner.mood.emoji} Партнёр: ${partner.mood.text}`;

        } else {

            partnerStatus.textContent =
                "Партнёр ещё не выбрал настроение 💭";
        }

    });

}


// ================================
// ЗАГРУЗКА ПАРЫ
// ================================

async function loadPair(pairId) {

    try {

        const pairRef = doc(db, "pairs", pairId);

        const snapshot = await getDoc(pairRef);

        if (!snapshot.exists()) {

            localStorage.removeItem(
                "ourMoodPairId"
            );

            currentPairId = null;

            return;
        }

    } catch (error) {

        console.error(
            "Ошибка загрузки пары:",
            error
        );
    }

}


// ================================
// ГЕНЕРАЦИЯ КОДА
// ================================

function generatePairCode() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let result = "";

    for (let i = 0; i < 6; i++) {

        result += characters.charAt(
            Math.floor(
                Math.random() * characters.length
            )
        );

    }

    return result;
}


// ================================
// ВОССТАНОВЛЕНИЕ НАСТРОЕНИЯ
// ================================

const savedMood =
    localStorage.getItem("ourMood");

if (savedMood) {

    try {

        const mood = JSON.parse(savedMood);

        moodButtons.forEach(button => {

            if (
                button.dataset.mood ===
                mood.text
            ) {

                button.classList.add("selected");

                selectedMood = mood;
            }

        });

    } catch (error) {

        console.error(
            "Ошибка восстановления настроения:",
            error
        );
    }
}
sharePairButton.addEventListener("click", () => {

    if (!currentPairId) return;

    const inviteLink =
        `https://t.me/OurMoodCoupleBot?startapp=${currentPairId}`;

    if (tg && tg.openTelegramLink) {

        tg.openTelegramLink(
            `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent("Присоединяйся к нашей паре в OurMood 💜")}`
        );

    } else {

        navigator.clipboard.writeText(inviteLink);

        alert("Ссылка скопирована 💌");
    }

});



