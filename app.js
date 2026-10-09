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
// FIREBASE CONFIG
// ================================

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
// ПЕРЕМЕННЫЕ
// ================================

let selectedMood = null;
let currentUser = null;
let currentPairId = null;

// Имя пользователя.
// Оно вводится один раз и потом берётся отсюда.
let currentUserName =
    localStorage.getItem("ourMoodName");


// ================================
// ЭЛЕМЕНТЫ
// ================================

const moodButtons =
    document.querySelectorAll(".mood");

const saveButton =
    document.getElementById("save-mood");

const message =
    document.getElementById("message");

const createPairButton =
    document.getElementById("create-pair");

const joinPairButton =
    document.getElementById("join-pair");

const sharePairButton =
    document.getElementById("share-pair");

const leavePairButton =
    document.getElementById("leave-pair");

const partnerStatus =
    document.getElementById("partner-status");


// ================================
// ОКНО ВВОДА ИМЕНИ
// ================================

const nameModal =
    document.getElementById("name-modal");

const nameInput =
    document.getElementById("name-input");

const nameSubmit =
    document.getElementById("name-submit");


// Если имя уже есть — окно не показываем
if (currentUserName) {

    nameModal.classList.add("hidden");

}


// Кнопка "Продолжить"
nameSubmit.addEventListener(
    "click",
    saveUserName
);


// Enter тоже подтверждает имя
nameInput.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {

            saveUserName();

        }

    }
);


// ================================
// СОХРАНЕНИЕ ИМЕНИ
// ================================

function saveUserName() {

    const name =
        nameInput.value.trim();


    // Имя не может быть пустым
    if (!name) {

        nameInput.focus();

        return;

    }


    // Сохраняем имя локально
    currentUserName = name;

    localStorage.setItem(
        "ourMoodName",
        currentUserName
    );


    // Закрываем окно
    nameModal.classList.add(
        "hidden"
    );


    // Если пользователь уже авторизован
    // и уже находится в паре —
    // сразу сохраняем имя в Firebase
    if (currentUser && currentPairId) {

        saveNameToPair();

    }

}


// ================================
// СОХРАНЕНИЕ ИМЕНИ В ПАРЕ
// ================================

async function saveNameToPair() {

    if (
        !currentUser ||
        !currentPairId ||
        !currentUserName
    ) {

        return;

    }


    try {

        const pairRef =
            doc(
                db,
                "pairs",
                currentPairId
            );


        await updateDoc(
            pairRef,
            {

                [`members.${currentUser.uid}.name`]:
                    currentUserName

            }
        );


        console.log(
            "Имя сохранено в Firebase:",
            currentUserName
        );


    } catch (error) {

        console.error(
            "Ошибка сохранения имени:",
            error
        );

    }

}


// ================================
// ВХОД АНОНИМНО
// ================================

signInAnonymously(auth)
    .catch((error) => {

        console.error(
            "Ошибка авторизации:",
            error
        );


        message.textContent =
            "Не удалось подключиться к Firebase 😔";

    });


// ================================
// ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ
// ================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) return;


        currentUser = user;


        console.log(
            "Firebase user:",
            currentUser.uid
        );


        // ====================================
        // ПРОВЕРЯЕМ СОХРАНЁННУЮ ПАРУ
        // ====================================

        const savedPairId =
            localStorage.getItem(
                "ourMoodPairId"
            );


        if (savedPairId) {

            currentPairId =
                savedPairId;


            sharePairButton.style.display =
                "block";


            await loadPair(
                savedPairId
            );


            if (currentPairId) {

                // Записываем имя в существующую пару
                await saveNameToPair();


                // Слушаем изменения
                listenToPair(
                    savedPairId
                );

            }


            return;

        }


        // ====================================
        // ПРОВЕРЯЕМ TELEGRAM INVITE
        // ====================================

        const startParam =
            tg?.initDataUnsafe?.start_param;


        if (startParam) {

            await joinPairByCode(
                startParam
            );

        }

    }
);


// ================================
// НАСТРОЕНИЯ
// ================================

moodButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                moodButtons.forEach(
                    (item) => {

                        item.classList.remove(
                            "selected"
                        );

                    }
                );


                button.classList.add(
                    "selected"
                );


                selectedMood = {

                    emoji:
                        button.querySelector(
                            "span"
                        ).textContent,

                    text:
                        button.dataset.mood

                };


                message.textContent = "";

            }
        );

    }
);


// ================================
// СОХРАНЕНИЕ НАСТРОЕНИЯ
// ================================

saveButton.addEventListener(
    "click",
    async () => {

        if (!selectedMood) {

            message.textContent =
                "Сначала выбери настроение 💜";

            return;

        }


        if (!currentUser) {

            message.textContent =
                "Подключаемся к серверу...";

            return;

        }


        if (!currentPairId) {

            message.textContent =
                "Сначала создай или подключи пару 💌";

            return;

        }


        try {

            const pairRef =
                doc(
                    db,
                    "pairs",
                    currentPairId
                );


            await updateDoc(
                pairRef,
                {

                    [`members.${currentUser.uid}.mood`]:
                        selectedMood,

                    [`members.${currentUser.uid}.updatedAt`]:
                        Date.now()

                }
            );


            localStorage.setItem(
                "ourMood",
                JSON.stringify(
                    selectedMood
                )
            );


            message.textContent =
                `${selectedMood.emoji} Твоё настроение: ${selectedMood.text}`;


        } catch (error) {

            console.error(
                error
            );


            message.textContent =
                "Не удалось сохранить настроение 😔";

        }

    }
);


// ================================
// СОЗДАНИЕ ПАРЫ
// ================================

createPairButton.addEventListener(
    "click",
    async () => {

        if (!currentUser) {

            alert(
                "Подключаемся к серверу..."
            );

            return;

        }


        // Без имени нельзя создать пару
        if (!currentUserName) {

            nameModal.classList.remove(
                "hidden"
            );


            nameInput.focus();


            return;

        }


        try {

            const pairCode =
                generatePairCode();


            const pairRef =
                doc(
                    db,
                    "pairs",
                    pairCode
                );


            await setDoc(
                pairRef,
                {

                    code:
                        pairCode,

                    members: {

                        [currentUser.uid]: {

                            name:
                                currentUserName,

                            mood:
                                null,

                            updatedAt:
                                Date.now()

                        }

                    },

                    createdAt:
                        Date.now()

                }
            );


            currentPairId =
                pairCode;


            localStorage.setItem(
                "ourMoodPairId",
                pairCode
            );


            alert(
                `Ваша пара создана! 💜\n\nКод для партнёра:\n${pairCode}`
            );


            partnerStatus.textContent =
                `Код пары: ${pairCode}`;


            sharePairButton.style.display =
                "block";


            listenToPair(
                pairCode
            );

        } catch (error) {

            console.error(
                error
            );


            alert(
                "Не удалось создать пару 😔"
            );

        }

    }
);


// ================================
// ПОДКЛЮЧЕНИЕ К ПАРТНЁРУ
// ================================

joinPairButton.addEventListener(
    "click",
    async () => {

        const code =
            prompt(
                "Введите код пары 💌"
            );


        if (!code) return;


        await joinPairByCode(
            code
        );

    }
);


// ================================
// ПОДКЛЮЧЕНИЕ ПО КОДУ
// ================================

async function joinPairByCode(
    pairCode
) {

    if (!currentUser) {

        alert(
            "Подключаемся к серверу..."
        );

        return;

    }


    // Если имя ещё не введено
    if (!currentUserName) {

        nameModal.classList.remove(
            "hidden"
        );


        nameInput.focus();


        return;

    }


    pairCode =
        pairCode
            .trim()
            .toUpperCase();


    try {

        const pairRef =
            doc(
                db,
                "pairs",
                pairCode
            );


        const pairSnapshot =
            await getDoc(
                pairRef
            );


        if (!pairSnapshot.exists()) {

            alert(
                "Такой пары не существует 😔"
            );

            return;

        }


        const pairData =
            pairSnapshot.data();


        const members =
            pairData.members || {};


        const memberIds =
            Object.keys(
                members
            );


        // ====================================
        // УЖЕ В ЭТОЙ ПАРЕ
        // ====================================

        if (
            members[
                currentUser.uid
            ]
        ) {

            currentPairId =
                pairCode;


            localStorage.setItem(
                "ourMoodPairId",
                pairCode
            );


            // На всякий случай
            // сохраняем имя
            await saveNameToPair();


            partnerStatus.textContent =
                "Вы подключены 💜";


            sharePairButton.style.display =
                "block";


            listenToPair(
                pairCode
            );


            return;

        }


        // ====================================
        // В ПАРЕ УЖЕ 2 ЧЕЛОВЕКА
        // ====================================

        if (
            memberIds.length >= 2
        ) {

            alert(
                "В этой паре уже есть два человека 💜"
            );


            return;

        }


        // ====================================
        // ДОБАВЛЯЕМ ПОЛЬЗОВАТЕЛЯ
        // ====================================

        await updateDoc(
            pairRef,
            {

                [`members.${currentUser.uid}`]:
                    {

                        name:
                            currentUserName,

                        mood:
                            null,

                        updatedAt:
                            Date.now()

                    }

            }
        );


        currentPairId =
            pairCode;


        localStorage.setItem(
            "ourMoodPairId",
            pairCode
        );


        partnerStatus.textContent =
            "Вы подключены 💜";


        sharePairButton.style.display =
            "block";


        listenToPair(
            pairCode
        );


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


// ================================
// ВЫХОД ИЗ ПАРЫ
// ================================

leavePairButton.addEventListener(
    "click",
    async () => {

        if (
            !currentUser ||
            !currentPairId
        ) {

            alert(
                "Ты сейчас не состоишь в паре 💜"
            );


            return;

        }


        const confirmed =
            confirm(
                "Ты точно хочешь покинуть пару? 💔"
            );


        if (!confirmed) return;


        try {

            const pairRef =
                doc(
                    db,
                    "pairs",
                    currentPairId
                );


            await updateDoc(
                pairRef,
                {

                    [`members.${currentUser.uid}`]:
                        deleteField()

                }
            );


            localStorage.removeItem(
                "ourMoodPairId"
            );


            currentPairId =
                null;


            partnerStatus.textContent =
                "Пока вы не подключены";


            sharePairButton.style.display =
                "none";


            alert(
                "Ты покинул(а) пару 💜"
            );


        } catch (error) {

            console.error(
                "Ошибка выхода из пары:",
                error
            );


            alert(
                "Не удалось покинуть пару 😔"
            );

        }

    }
);


// ================================
// СЛУШАЕМ ИЗМЕНЕНИЯ ПАРЫ
// ================================

function listenToPair(
    pairId
) {

    const pairRef =
        doc(
            db,
            "pairs",
            pairId
        );


    onSnapshot(
        pairRef,
        (snapshot) => {

            if (!snapshot.exists()) {

                return;

            }


            const data =
                snapshot.data();


            const members =
                data.members || {};


            const memberIds =
                Object.keys(
                    members
                );


            // Находим партнёра
            const partnerId =
                memberIds.find(
                    id =>
                        id !==
                        currentUser.uid
                );


            // Партнёра пока нет
            if (!partnerId) {

                partnerStatus.textContent =
                    "Ожидаем партнёра 💌";


                return;

            }


            const partner =
                members[
                    partnerId
                ];


            // Имя партнёра
            const partnerName =
                partner.name ||
                "Партнёр";


            // Партнёр подключён
            if (partner.mood) {

                console.log(
                    "Настроение партнёра:",
                    partner.mood
                );


                partnerStatus.textContent =
                    `${partner.mood.emoji} ${partnerName}: ${partner.mood.text}`;

            } else {

                partnerStatus.textContent =
                    `${partnerName} ещё не выбрал настроение 💭`;

            }

        }
    );

}


// ================================
// ЗАГРУЗКА ПАРЫ
// ================================

async function loadPair(
    pairId
) {

    try {

        const pairRef =
            doc(
                db,
                "pairs",
                pairId
            );


        const snapshot =
            await getDoc(
                pairRef
            );


        if (!snapshot.exists()) {

            localStorage.removeItem(
                "ourMoodPairId"
            );


            currentPairId =
                null;


            sharePairButton.style.display =
                "none";


            partnerStatus.textContent =
                "Пока вы не подключены";


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
// ГЕНЕРАЦИЯ КОДА ПАРЫ
// ================================

function generatePairCode() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


    let result = "";


    for (
        let i = 0;
        i < 6;
        i++
    ) {

        result +=
            characters.charAt(
                Math.floor(
                    Math.random() *
                    characters.length
                )
            );

    }


    return result;

}


// ================================
// ВОССТАНОВЛЕНИЕ НАСТРОЕНИЯ
// ================================

const savedMood =
    localStorage.getItem(
        "ourMood"
    );


if (savedMood) {

    try {

        const mood =
            JSON.parse(
                savedMood
            );


        moodButtons.forEach(
            (button) => {

                if (
                    button.dataset.mood ===
                    mood.text
                ) {

                    button.classList.add(
                        "selected"
                    );


                    selectedMood =
                        mood;

                }

            }
        );


    } catch (error) {

        console.error(
            "Ошибка восстановления настроения:",
            error
        );

    }

}


// ================================
// ПРИГЛАШЕНИЕ
// ================================

sharePairButton.addEventListener(
    "click",
    () => {

        if (!currentPairId) return;


        const inviteLink =
            `https://t.me/OurMoodCoupleBot?startapp=${currentPairId}`;


        if (
            tg &&
            tg.openTelegramLink
        ) {

            tg.openTelegramLink(

                `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent("Присоединяйся к нашей паре в OurMood 💜")}`

            );

        } else {

            navigator.clipboard.writeText(
                inviteLink
            );


            alert(
                "Ссылка скопирована 💌"
            );

        }

    }
);