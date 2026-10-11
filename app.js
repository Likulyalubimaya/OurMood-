import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

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


// ======================================================
// FIREBASE
// ======================================================

const firebaseConfig = {
    apiKey: "AIzaSyDqcukb88QN0CcJ3miBMgoine5Pom_YliU",
    authDomain: "ourmood-874e2.firebaseapp.com",
    projectId: "ourmood-874e2",
    storageBucket: "ourmood-874e2.firebasestorage.app",
    messagingSenderId: "998164287763",
    appId: "1:998164287763:web:a4b68645c2bed35f814ae6",
    measurementId: "G-8PLHN9Q3CT"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


// ======================================================
// TELEGRAM
// ======================================================

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}


// ======================================================
// DOM
// ======================================================

const $ = id => document.getElementById(id);

const moodButtons = [
    ...document.querySelectorAll(".mood")
];

const nameModal = $("name-modal");

const nameInput = $("name-input");

const nameSubmit = $("name-submit");

const genderInputs = [
    ...document.querySelectorAll('input[name="gender"]')
];

const message = $("message");

const partnerStatus = $("partner-status");

const sharePairButton = $("share-pair");


// ======================================================
// СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ
// ======================================================

let currentUser = null;

let currentPairId =
    localStorage.getItem("ourMoodPairId") || null;

let currentUserName =
    localStorage.getItem("ourMoodName") || "";

let currentUserGender =
    localStorage.getItem("ourMoodGender") || "";

let selectedMood = null;

let stopListening = null;


// Ссылка-приглашение из Telegram
let pendingInviteCode =
    tg?.initDataUnsafe?.start_param || null;


// ======================================================
// ПРОФИЛЬ
// ======================================================

function openProfileModal() {

    nameInput.value = currentUserName;

    genderInputs.forEach(input => {

        input.checked =
            input.value === currentUserGender;

    });

    nameModal.classList.remove("hidden");

    setTimeout(() => {

        nameInput.focus();

    }, 100);
}


function closeProfileModal() {

    nameModal.classList.add("hidden");

}


// ======================================================
// ИЗМЕНЕНИЕ НАЗВАНИЙ НАСТРОЕНИЙ
// ======================================================

function updateMoodButtons() {

    const female =
        currentUserGender === "female";


    const labels = {

        "Счастлив":
            female
                ? "Счастлива"
                : "Счастлив",

        "Влюблён":
            female
                ? "Влюблена"
                : "Влюблён",

        "Устал":
            female
                ? "Устала"
                : "Устал"

    };


    moodButtons.forEach(button => {

        const base =
            button.dataset.mood;

        const small =
            button.querySelector("small");


        if (small && labels[base]) {

            small.textContent =
                labels[base];

        }

    });

}


// ======================================================
// ТЕКСТ НАСТРОЕНИЯ ДЛЯ ПАРТНЁРА
// ======================================================

function getMoodText(mood, gender) {

    if (!mood) {
        return "";
    }


    const text =
        String(mood).toLowerCase();


    if (text.includes("счастлив")) {

        return gender === "female"
            ? "счастлива"
            : "счастлив";

    }


    if (text.includes("влюбл")) {

        return gender === "female"
            ? "влюблена"
            : "влюблён";

    }


    if (text.includes("устал")) {

        return gender === "female"
            ? "устала"
            : "устал";

    }


    if (text.includes("скуч")) {

        return "скучает";

    }


    if (text.includes("груст")) {

        return "грустит";

    }


    if (text.includes("зл")) {

        return "злится";

    }


    return mood;
}


// ======================================================
// СОХРАНЕНИЕ ПРОФИЛЯ В ПАРУ
// ======================================================

async function saveProfileToPair() {

    if (
        !currentUser ||
        !currentPairId ||
        !currentUserName ||
        !currentUserGender
    ) {
        return;
    }


    await updateDoc(
        doc(db, "pairs", currentPairId),
        {

            [`members.${currentUser.uid}.name`]:
                currentUserName,

            [`members.${currentUser.uid}.gender`]:
                currentUserGender

        }
    );

}


// ======================================================
// СОХРАНЕНИЕ ПРОФИЛЯ
// ======================================================

async function saveUserProfile() {

    const name =
        nameInput.value.trim();


    const selectedGender =
        document.querySelector(
            'input[name="gender"]:checked'
        );


    if (!name) {

        alert(
            "Пожалуйста, введи своё имя 💜"
        );

        nameInput.focus();

        return;
    }


    if (!selectedGender) {

        alert(
            "Пожалуйста, выбери пол 💜"
        );

        return;
    }


    currentUserName =
        name.slice(0, 20);


    currentUserGender =
        selectedGender.value;


    localStorage.setItem(
        "ourMoodName",
        currentUserName
    );


    localStorage.setItem(
        "ourMoodGender",
        currentUserGender
    );


    // Меняем названия кнопок
    updateMoodButtons();


    try {

        if (
            currentUser &&
            currentPairId
        ) {

            await saveProfileToPair();

        }


        closeProfileModal();


        // Если пользователь пришёл по приглашению
        if (
            pendingInviteCode &&
            currentUser
        ) {

            const code =
                pendingInviteCode;

            pendingInviteCode = null;

            await joinPairByCode(code);

        }

    } catch (error) {

        console.error(
            "Ошибка сохранения профиля:",
            error
        );


        message.textContent =
            "Профиль сохранён на устройстве, но не удалось обновить пару.";

    }

}


// ======================================================
// КНОПКИ ПРОФИЛЯ
// ======================================================

nameSubmit.addEventListener(
    "click",
    saveUserProfile
);


nameInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            saveUserProfile();

        }

    }
);


$("change-profile").addEventListener(
    "click",
    openProfileModal
);


// ======================================================
// СОЗДАНИЕ КОДА ПАРЫ
// ======================================================

function generatePairCode() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


    return Array.from(
        { length: 6 },
        () =>
            chars[
                Math.floor(
                    Math.random() *
                    chars.length
                )
            ]
    ).join("");

}


// ======================================================
// СИНХРОНИЗАЦИЯ ПАРЫ
// ======================================================

function listenToPair(pairId) {

    if (stopListening) {

        stopListening();

    }


    stopListening =
        onSnapshot(
            doc(db, "pairs", pairId),

            snapshot => {

                if (!snapshot.exists()) {

                    partnerStatus.textContent =
                        "Пара не найдена. Создай новую или подключись снова.";

                    return;
                }


                const members =
                    snapshot.data().members || {};


                const ids =
                    Object.keys(members);


                const partnerId =
                    ids.find(
                        id =>
                            id !== currentUser?.uid
                    );


                if (!partnerId) {

                    partnerStatus.textContent =
                        "Ожидаем партнёра 💌";

                    return;
                }


                const partner =
                    members[partnerId];


                const partnerName =
                    partner.name ||
                    "Партнёр";


                if (partner.mood) {

                    partnerStatus.textContent =
                        `${partner.mood.emoji || "💜"} ${partnerName}: ${getMoodText(
                            partner.mood.text,
                            partner.gender
                        )}`;

                } else {

                    partnerStatus.textContent =
                        `${partnerName} ещё не выбрал настроение 💭`;

                }

            },

            error => {

                console.error(
                    "Ошибка обновления пары:",
                    error
                );


                partnerStatus.textContent =
                    "Не удалось обновить данные пары.";

            }
        );

}


// ======================================================
// ВОССТАНОВЛЕНИЕ ПАРЫ
// ======================================================

async function restorePair(pairId) {

    try {

        const snapshot =
            await getDoc(
                doc(db, "pairs", pairId)
            );


        if (!snapshot.exists()) {

            localStorage.removeItem(
                "ourMoodPairId"
            );

            currentPairId = null;

            sharePairButton.style.display =
                "none";

            partnerStatus.textContent =
                "Пока вы не подключены";

            return;
        }


        const members =
            snapshot.data().members || {};


        if (!members[currentUser.uid]) {

            localStorage.removeItem(
                "ourMoodPairId"
            );

            currentPairId = null;

            sharePairButton.style.display =
                "none";

            partnerStatus.textContent =
                "Пока вы не подключены";

            return;
        }


        currentPairId = pairId;

        sharePairButton.style.display =
            "block";


        listenToPair(pairId);

    } catch (error) {

        console.error(
            "Ошибка загрузки пары:",
            error
        );


        partnerStatus.textContent =
            "Не удалось загрузить пару.";

    }

}


// ======================================================
// СОЗДАНИЕ ПАРЫ
// ======================================================

$("create-pair").addEventListener(
    "click",
    async () => {

        if (!currentUser) {

            alert(
                "Подключаемся к серверу..."
            );

            return;
        }


        if (
            !currentUserName ||
            !currentUserGender
        ) {

            openProfileModal();

            return;
        }


        if (currentPairId) {

            alert(
                "Ты уже состоишь в паре 💜"
            );

            return;
        }


        try {

            let pairCode =
                generatePairCode();


            let pairRef =
                doc(
                    db,
                    "pairs",
                    pairCode
                );


            while (
                (
                    await getDoc(pairRef)
                ).exists()
            ) {

                pairCode =
                    generatePairCode();

                pairRef =
                    doc(
                        db,
                        "pairs",
                        pairCode
                    );

            }


            await setDoc(
                pairRef,
                {

                    code: pairCode,

                    members: {

                        [currentUser.uid]: {

                            name:
                                currentUserName,

                            gender:
                                currentUserGender,

                            mood: null,

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


            sharePairButton.style.display =
                "block";


            partnerStatus.textContent =
                "Ожидаем партнёра 💌";


            listenToPair(pairCode);


            alert(
                `Ваша пара создана! 💜\n\nКод для партнёра:\n${pairCode}`
            );

        } catch (error) {

            console.error(error);

            alert(
                "Не удалось создать пару 😔"
            );

        }

    }
);


// ======================================================
// ПОДКЛЮЧЕНИЕ К ПАРЕ
// ======================================================

async function joinPairByCode(rawCode) {

    if (!currentUser) {

        pendingInviteCode =
            rawCode;

        alert(
            "Подключаемся к серверу..."
        );

        return;
    }


    if (
        !currentUserName ||
        !currentUserGender
    ) {

        pendingInviteCode =
            rawCode;

        openProfileModal();

        return;
    }


    const pairCode =
        String(rawCode)
            .trim()
            .toUpperCase();


    if (!pairCode) {
        return;
    }


    try {

        const pairRef =
            doc(
                db,
                "pairs",
                pairCode
            );


        const snapshot =
            await getDoc(pairRef);


        if (!snapshot.exists()) {

            alert(
                "Такой пары не существует 😔"
            );

            return;
        }


        const members =
            snapshot.data().members || {};


        const ids =
            Object.keys(members);


        // Пользователь уже в этой паре
        if (members[currentUser.uid]) {

            currentPairId =
                pairCode;


            localStorage.setItem(
                "ourMoodPairId",
                pairCode
            );


            await saveProfileToPair();


            sharePairButton.style.display =
                "block";


            listenToPair(pairCode);


            return;
        }


        // В паре уже два человека
        if (ids.length >= 2) {

            alert(
                "В этой паре уже есть два человека 💜"
            );

            return;
        }


        await updateDoc(
            pairRef,
            {

                [`members.${currentUser.uid}`]: {

                    name:
                        currentUserName,

                    gender:
                        currentUserGender,

                    mood: null,

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


        sharePairButton.style.display =
            "block";


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


// ======================================================
// КНОПКА ПОДКЛЮЧЕНИЯ
// ======================================================

$("join-pair").addEventListener(
    "click",
    async () => {

        const code =
            prompt(
                "Введите код пары 💌"
            );


        if (code) {

            await joinPairByCode(code);

        }

    }
);


// ======================================================
// ВЫХОД ИЗ ПАРЫ
// ======================================================

$("leave-pair").addEventListener(
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


        if (
            !confirm(
                "Ты точно хочешь покинуть пару? 💔"
            )
        ) {

            return;
        }


        try {

            await updateDoc(
                doc(
                    db,
                    "pairs",
                    currentPairId
                ),

                {
                    [`members.${currentUser.uid}`]:
                        deleteField()
                }
            );


            if (stopListening) {

                stopListening();

            }


            stopListening = null;


            localStorage.removeItem(
                "ourMoodPairId"
            );


            currentPairId = null;


            sharePairButton.style.display =
                "none";


            partnerStatus.textContent =
                "Пока вы не подключены";


            message.textContent =
                "Ты покинул(а) пару 💜";

        } catch (error) {

            console.error(error);


            alert(
                "Не удалось покинуть пару 😔"
            );

        }

    }
);


// ======================================================
// ВЫБОР НАСТРОЕНИЯ
// ======================================================

moodButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                moodButtons.forEach(
                    item =>
                        item.classList.remove(
                            "selected"
                        )
                );


                button.classList.add(
                    "selected"
                );


                selectedMood = {

                    emoji:
                        button
                            .querySelector("span")
                            .textContent,

                    text:
                        button.dataset.mood

                };


                message.textContent = "";

            }
        );

    }
);


// ======================================================
// СОХРАНЕНИЕ НАСТРОЕНИЯ
// ======================================================

$("save-mood").addEventListener(
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

            await updateDoc(
                doc(
                    db,
                    "pairs",
                    currentPairId
                ),

                {

                    [`members.${currentUser.uid}.mood`]:
                        selectedMood,

                    [`members.${currentUser.uid}.updatedAt`]:
                        Date.now()

                }
            );


            localStorage.setItem(
                "ourMood",
                JSON.stringify(selectedMood)
            );


            message.textContent =
                `${selectedMood.emoji} Твоё настроение: ${getMoodText(
                    selectedMood.text,
                    currentUserGender
                )}`;

        } catch (error) {

            console.error(error);


            message.textContent =
                "Не удалось сохранить настроение 😔";

        }

    }
);


// ======================================================
// ПРИГЛАШЕНИЕ ПАРТНЁРА
// ======================================================

sharePairButton.addEventListener(
    "click",
    async () => {

        if (!currentPairId) {

            alert(
                "Сначала создай пару 💜"
            );

            return;
        }


        const inviteLink =
            `https://t.me/OurMoodCoupleBot?startapp=${currentPairId}`;


        const shareLink =
            `https://t.me/share/url?url=${encodeURIComponent(
                inviteLink
            )}&text=${encodeURIComponent(
                "Присоединяйся к нашей паре в OurMood 💜"
            )}`;


        if (tg?.openTelegramLink) {

            tg.openTelegramLink(
                shareLink
            );

        } else {

            try {

                await navigator.clipboard.writeText(
                    inviteLink
                );


                alert(
                    "Ссылка-приглашение скопирована 💌"
                );

            } catch {

                prompt(
                    "Скопируй ссылку-приглашение:",
                    inviteLink
                );

            }

        }

    }
);


// ======================================================
// ВОССТАНОВЛЕНИЕ СОХРАНЁННОГО НАСТРОЕНИЯ
// ======================================================

try {

    const savedMood =
        JSON.parse(
            localStorage.getItem(
                "ourMood"
            ) || "null"
        );


    if (savedMood) {

        const normalized =
            String(
                savedMood.text || ""
            ).toLowerCase();


        const button =
            moodButtons.find(
                item => {

                    const key =
                        item.dataset.mood
                            .toLowerCase();


                    return (
                        normalized === key ||

                        (
                            key === "счастлив" &&
                            normalized.includes(
                                "счастлив"
                            )
                        ) ||

                        (
                            key === "влюблён" &&
                            normalized.includes(
                                "влюбл"
                            )
                        ) ||

                        (
                            key === "устал" &&
                            normalized.includes(
                                "устал"
                            )
                        )
                    );

                }
            );


        if (button) {

            button.classList.add(
                "selected"
            );


            selectedMood = {

                emoji:
                    button
                        .querySelector("span")
                        .textContent,

                text:
                    button.dataset.mood

            };

        }

    }

} catch (error) {

    console.warn(
        "Не удалось восстановить настроение:",
        error
    );

}


// ======================================================
// ЗАПУСК
// ======================================================

updateMoodButtons();


if (
    currentUserName &&
    currentUserGender
) {

    closeProfileModal();

} else {

    openProfileModal();

}


// ======================================================
// FIREBASE АВТОРИЗАЦИЯ
// ======================================================

signInAnonymously(auth)
    .catch(error => {

        console.error(
            "Ошибка авторизации:",
            error
        );


        message.textContent =
            "Не удалось подключиться к Firebase 😔";

    });


onAuthStateChanged(
    auth,
    async user => {

        if (!user) {
            return;
        }


        currentUser = user;


        if (currentPairId) {

            await restorePair(
                currentPairId
            );

        }


        else if (
            pendingInviteCode &&
            currentUserName &&
            currentUserGender
        ) {

            const code =
                pendingInviteCode;


            pendingInviteCode = null;


            await joinPairByCode(
                code
            );

        }

    }
);