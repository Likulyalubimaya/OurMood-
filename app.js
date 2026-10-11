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

const telegramUserId =
    tg?.initDataUnsafe?.user?.id || null;


// ======================================================
// УВЕДОМЛЕНИЯ
// ======================================================

const NOTIFICATION_FUNCTION_URL =
    "https://ourmood-notifications.vercel.app/api/notify";

async function notifyPartnerAboutMood(pairId, mood) {

    console.log(
        "🔔 notifyPartnerAboutMood ВЫЗВАНА",
        pairId,
        mood
    );

    if (
        !NOTIFICATION_FUNCTION_URL ||
        !telegramUserId ||
        !currentUser
    ) {
        return;
    }

    try {

        await fetch(
            NOTIFICATION_FUNCTION_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    pairId,
                    userId: currentUser.uid,
                    telegramUserId,
                    mood
                })
            }
        );

    } catch (error) {

        console.warn(
            "Не удалось отправить запрос на Telegram-уведомление:",
            error
        );

    }
}


// ======================================================
// DOM
// ======================================================

const $ = id =>
    document.getElementById(id);

const moodButtons = [
    ...document.querySelectorAll(".mood")
];

const nameModal =
    $("name-modal");

const nameInput =
    $("name-input");

const nameSubmit =
    $("name-submit");

const genderInputs = [
    ...document.querySelectorAll(
        'input[name="gender"]'
    )
];

const message =
    $("message");

const partnerStatus =
    $("partner-status");

const sharePairButton =
    $("share-pair");


// ======================================================
// СОСТОЯНИЕ
// ======================================================

let currentUser = null;

let currentPairId =
    localStorage.getItem(
        "ourMoodPairId"
    ) || null;

let currentUserName =
    localStorage.getItem(
        "ourMoodName"
    ) || "";

let currentUserGender =
    localStorage.getItem(
        "ourMoodGender"
    ) || "";

let selectedMood = null;

let stopListening = null;

let pendingInviteCode =
    tg?.initDataUnsafe?.start_param || null;


// ======================================================
// МЕНЮ
// ======================================================

const menuButton =
    $("menu-button");

const closeMenuButton =
    $("close-menu");

const sideMenu =
    $("side-menu");

const menuOverlay =
    $("menu-overlay");


function openMenu() {

    sideMenu?.classList.add(
        "open"
    );

    menuOverlay?.classList.add(
        "open"
    );

}


function closeMenu() {

    sideMenu?.classList.remove(
        "open"
    );

    menuOverlay?.classList.remove(
        "open"
    );

}


menuButton?.addEventListener(
    "click",
    openMenu
);

closeMenuButton?.addEventListener(
    "click",
    closeMenu
);

menuOverlay?.addEventListener(
    "click",
    closeMenu
);


// ======================================================
// ПРОФИЛЬ
// ======================================================

function openProfileModal(
    isEditing = false
) {

    nameInput.value =
        currentUserName;

    genderInputs.forEach(
        input => {

            input.checked =
                input.value ===
                currentUserGender;

        }
    );

    const title =
        $("profile-modal-title");

    const subtitle =
        $("profile-modal-subtitle");


    if (isEditing) {

        title.textContent =
            "Изменение профиля";

        subtitle.textContent =
            "Измени свои данные";

        nameSubmit.textContent =
            "Сохранить изменения →";

    } else {

        title.textContent =
            "Добро пожаловать в OurMood!";

        subtitle.textContent =
            "Расскажи немного о себе";

        nameSubmit.textContent =
            "Продолжить →";

    }

    nameModal.classList.remove(
        "hidden"
    );

    setTimeout(
        () => nameInput.focus(),
        100
    );

}


function closeProfileModal() {

    nameModal.classList.add(
        "hidden"
    );

}


// ======================================================
// НАЗВАНИЯ НАСТРОЕНИЙ
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


    moodButtons.forEach(
        button => {

            const baseMood =
                button.dataset.mood;

            const textElement =
                button.querySelector(
                    "small"
                );

            if (
                textElement &&
                labels[baseMood]
            ) {

                textElement.textContent =
                    labels[baseMood];

            }

        }
    );

}


// ======================================================
// ТЕКСТ НАСТРОЕНИЯ ПАРТНЁРА
// ======================================================

function getMoodText(
    mood,
    gender
) {

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
// СОХРАНЕНИЕ ПРОФИЛЯ В ПАРЕ
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
        doc(
            db,
            "pairs",
            currentPairId
        ),
        {

            [`members.${currentUser.uid}.name`]:
                currentUserName,

            [`members.${currentUser.uid}.gender`]:
                currentUserGender,

            [`members.${currentUser.uid}.telegramId`]:
                telegramUserId

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


    updateMoodButtons();


    try {

        if (
            currentUser &&
            currentPairId
        ) {

            await saveProfileToPair();

        }


        closeProfileModal();


        if (
            pendingInviteCode &&
            currentUser
        ) {

            const code =
                pendingInviteCode;

            pendingInviteCode =
                null;

            await joinPairByCode(
                code
            );

        }

    } catch (error) {

        console.error(
            "Ошибка сохранения профиля:",
            error
        );

        message.textContent =
            "Не удалось обновить профиль в паре.";

    }

}


// ======================================================
// ПРОФИЛЬ — КНОПКИ
// ======================================================

nameSubmit?.addEventListener(
    "click",
    saveUserProfile
);


nameInput?.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Enter"
        ) {

            saveUserProfile();

        }

    }
);


$("change-profile")?.addEventListener(
    "click",
    () => {

        closeMenu();

        openProfileModal(
            true
        );

    }
);


// ======================================================
// ГЕНЕРАЦИЯ КОДА
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
// СЛУШАТЬ ПАРУ
// ======================================================

function listenToPair(
    pairId
) {

    if (stopListening) {
        stopListening();
    }


    stopListening =
        onSnapshot(
            doc(
                db,
                "pairs",
                pairId
            ),

            snapshot => {

                if (!snapshot.exists()) {

                    partnerStatus.textContent =
                        "Пара не найдена. Создай новую или подключись снова.";

                    return;

                }


                const members =
                    snapshot.data().members ||
                    {};

                const ids =
                    Object.keys(
                        members
                    );


                const partnerId =
                    ids.find(
                        id =>
                            id !==
                            currentUser?.uid
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

async function restorePair(
    pairId
) {

    try {

        const snapshot =
            await getDoc(
                doc(
                    db,
                    "pairs",
                    pairId
                )
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


        const members =
            snapshot.data().members ||
            {};


        if (
            !members[
                currentUser.uid
            ]
        ) {

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


        currentPairId =
            pairId;

        sharePairButton.style.display =
            "block";

        listenToPair(
            pairId
        );

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

$("create-pair")?.addEventListener(
    "click",
    async () => {

        closeMenu();


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
                    await getDoc(
                        pairRef
                    )
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

                    code:
                        pairCode,

                    members: {

                        [currentUser.uid]: {

                            name:
                                currentUserName,

                            gender:
                                currentUserGender,

                            telegramId:
                                telegramUserId,

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


            sharePairButton.style.display =
                "block";


            partnerStatus.textContent =
                "Ожидаем партнёра 💌";


            listenToPair(
                pairCode
            );


            alert(
                `Ваша пара создана! 💜\n\nКод для партнёра:\n${pairCode}`
            );


        } catch (error) {

            console.error(
                "Ошибка создания пары:",
                error
            );

            alert(
                "Не удалось создать пару 😔"
            );

        }

    }
);


// ======================================================
// ПОДКЛЮЧЕНИЕ К ПАРЕ
// ======================================================

async function joinPairByCode(
    rawCode
) {

    if (!currentUser) {

        pendingInviteCode =
            rawCode;

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
            await getDoc(
                pairRef
            );


        if (!snapshot.exists()) {

            alert(
                "Такой пары не существует 😔"
            );

            return;

        }


        const members =
            snapshot.data().members ||
            {};

        const ids =
            Object.keys(
                members
            );


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

            await saveProfileToPair();

            sharePairButton.style.display =
                "block";

            listenToPair(
                pairCode
            );

            return;

        }


        if (ids.length >= 2) {

            alert(
                "В этой паре уже есть два человека 💜"
            );

            return;

        }


        await updateDoc(
            pairRef,
            {

                [`members.${currentUser.uid}`]:
                {

                    name:
                        currentUserName,

                    gender:
                        currentUserGender,

                    telegramId:
                        telegramUserId,

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


// ======================================================
// КНОПКА ПОДКЛЮЧЕНИЯ
// ======================================================

$("join-pair")?.addEventListener(
    "click",
    async () => {

        closeMenu();

        const code =
            prompt(
                "Введите код пары 💌"
            );


        if (code) {

            await joinPairByCode(
                code
            );

        }

    }
);


// ======================================================
// ПОКИНУТЬ ПАРУ
// ======================================================

$("leave-pair")?.addEventListener(
    "click",
    async () => {

        closeMenu();


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

            stopListening =
                null;


            localStorage.removeItem(
                "ourMoodPairId"
            );


            currentPairId =
                null;


            sharePairButton.style.display =
                "none";


            partnerStatus.textContent =
                "Пока вы не подключены";


            message.textContent =
                "Ты покинул(а) пару 💜";


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


// ======================================================
// НАСТРОЕНИЕ
// ======================================================

moodButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                moodButtons.forEach(
                    item => {

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
                        button
                            .querySelector(
                                "span"
                            )
                            .textContent,

                    text:
                        button.dataset.mood

                };


                message.textContent =
                    "";

            }
        );

    }
);


// ======================================================
// СОХРАНЕНИЕ НАСТРОЕНИЯ
// ======================================================

$("save-mood")?.addEventListener(
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

            console.log(
                "🟢 НАЖАТИЕ СОХРАНИТЬ — начинаем сохранение",
                selectedMood
            );


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


            console.log(
                "🟢 НАСТРОЕНИЕ СОХРАНЕНО"
            );


            // Уведомления пока оставляем
            // в коде, но если backend не работает,
            // само сохранение настроения всё равно работает.
            await notifyPartnerAboutMood(
                currentPairId,
                selectedMood
            );


            localStorage.setItem(
                "ourMood",
                JSON.stringify(
                    selectedMood
                )
            );


            message.textContent =
                `${selectedMood.emoji} Твоё настроение: ${getMoodText(
                    selectedMood.text,
                    currentUserGender
                )}`;


        } catch (error) {

            console.error(
                "Ошибка сохранения настроения:",
                error
            );

            message.textContent =
                "Не удалось сохранить настроение 😔";

        }

    }
);


// ======================================================
// ПРИГЛАШЕНИЕ
// ======================================================

sharePairButton?.addEventListener(
    "click",
    async () => {

        closeMenu();


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
// ВОССТАНОВЛЕНИЕ НАСТРОЕНИЯ
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
                savedMood.text ||
                ""
            ).toLowerCase();


        const button =
            moodButtons.find(
                item => {

                    const key =
                        item.dataset.mood
                            .toLowerCase();


                    return (

                        normalized === key

                        ||

                        (
                            key === "счастлив" &&
                            normalized.includes(
                                "счастлив"
                            )
                        )

                        ||

                        (
                            key === "влюблён" &&
                            normalized.includes(
                                "влюбл"
                            )
                        )

                        ||

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
                        .querySelector(
                            "span"
                        )
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
// КАЛЕНДАРЬ
// ======================================================

const eventModal =
    $("event-modal");

const eventModalClose =
    $("event-modal-close");

const eventModalDate =
    $("event-modal-date");

const eventOptions =
    document.querySelectorAll(
        ".event-option"
    );

const customEventBlock =
    $("custom-event-block");

const customEventInput =
    $("custom-event-input");

const saveCustomEvent =
    $("save-custom-event");


const calendarMonth =
    $("calendar-month");

const prevMonthButton =
    $("prev-month");

const nextMonthButton =
    $("next-month");

const calendarDaysContainer =
    $("calendar-days");


let selectedCalendarDate =
    null;

let calendarDate =
    new Date();


const calendarMonthNames = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь"
];


const calendarEventNames = {

    together:
        "💜 Сегодня вместе",

    date:
        "❤️ Свидание",

    holiday:
        "🎉 Праздник"

};


// ======================================================
// ПОЛУЧИТЬ СОБЫТИЯ
// ======================================================

function getCalendarEvents() {

    try {

        return JSON.parse(
            localStorage.getItem(
                "ourMoodCalendarEvents"
            )
        ) || {};

    } catch {

        return {};

    }

}


// ======================================================
// СОХРАНИТЬ СОБЫТИЯ
// ======================================================

function saveCalendarEvents(
    events
) {

    localStorage.setItem(
        "ourMoodCalendarEvents",
        JSON.stringify(
            events
        )
    );

}


// ======================================================
// КЛЮЧ ДАТЫ
// ======================================================

function getCalendarDateKey(
    year,
    month,
    day
) {

    return `${year}-${String(
        month + 1
    ).padStart(
        2,
        "0"
    )}-${String(
        day
    ).padStart(
        2,
        "0"
    )}`;

}


// ======================================================
// ОТКРЫТЬ ОКНО СОБЫТИЯ
// ======================================================

function openEventModal(
    date
) {

    if (!eventModal) {
        return;
    }


    selectedCalendarDate =
        date;


    const dateObject =
        new Date(
            date +
            "T12:00:00"
        );


    const formattedDate =
        dateObject.toLocaleDateString(
            "ru-RU",
            {
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );


    if (eventModalDate) {

        eventModalDate.textContent =
            formattedDate;

    }


    customEventBlock?.classList.remove(
        "open"
    );


    if (customEventInput) {
        customEventInput.value = "";
    }


    eventModal.classList.add(
        "open"
    );

}


// ======================================================
// ЗАКРЫТЬ ОКНО СОБЫТИЯ
// ======================================================

function closeEventModal() {

    eventModal?.classList.remove(
        "open"
    );


    selectedCalendarDate =
        null;


    customEventBlock?.classList.remove(
        "open"
    );


    if (customEventInput) {
        customEventInput.value = "";
    }

}


eventModalClose?.addEventListener(
    "click",
    closeEventModal
);


eventModal?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            eventModal
        ) {

            closeEventModal();

        }

    }
);


// ======================================================
// ТОЧКИ СОБЫТИЙ
// ======================================================

function updateCalendarEventDots() {

    if (!calendarDaysContainer) {
        return;
    }


    const events =
        getCalendarEvents();


    const days =
        calendarDaysContainer.querySelectorAll(
            ".calendar-day"
        );


    days.forEach(
        day => {

            const date =
                day.dataset.date;


            day.classList.remove(
                "has-event"
            );


            if (
                date &&
                events[date]
            ) {

                day.classList.add(
                    "has-event"
                );


                day.title =
                    events[date].text;

            }

        }
    );

}


// ======================================================
// ВЫБОР СОБЫТИЯ
// ======================================================

eventOptions.forEach(
    button => {

        button.addEventListener(
            "click",
            function () {

                const eventType =
                    this.dataset.event;


                // Своя отметка
                if (
                    eventType ===
                    "custom"
                ) {

                    customEventBlock?.classList.add(
                        "open"
                    );


                    setTimeout(
                        () => {
                            customEventInput?.focus();
                        },
                        100
                    );


                    return;

                }


                if (!selectedCalendarDate) {
                    return;
                }


                const events =
                    getCalendarEvents();


                events[
                    selectedCalendarDate
                ] = {

                    type:
                        eventType,

                    text:
                        calendarEventNames[
                            eventType
                        ]

                };


                saveCalendarEvents(
                    events
                );


                closeEventModal();


                renderCalendar();

            }
        );

    }
);


// ======================================================
// СВОЯ ОТМЕТКА
// ======================================================

saveCustomEvent?.addEventListener(
    "click",
    () => {

        const text =
            customEventInput.value.trim();


        if (!text) {

            customEventInput.focus();

            return;

        }


        if (!selectedCalendarDate) {
            return;
        }


        const events =
            getCalendarEvents();


        events[
            selectedCalendarDate
        ] = {

            type:
                "custom",

            text:
                "✏️ " + text

        };


        saveCalendarEvents(
            events
        );


        closeEventModal();


        renderCalendar();

    }
);


// ======================================================
// ENTER В СВОЕЙ ОТМЕТКЕ
// ======================================================

customEventInput?.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Enter"
        ) {

            saveCustomEvent?.click();

        }

    }
);


// ======================================================
// НАЖАТИЕ НА ДЕНЬ
// ======================================================

calendarDaysContainer?.addEventListener(
    "click",
    event => {

        const dayButton =
            event.target.closest(
                ".calendar-day"
            );


        if (!dayButton) {
            return;
        }


        if (
            dayButton.classList.contains(
                "empty"
            )
        ) {

            return;

        }


        const date =
            dayButton.dataset.date;


        if (!date) {
            return;
        }


        openEventModal(
            date
        );

    }
);


// ======================================================
// ОТРИСОВКА КАЛЕНДАРЯ
// ======================================================

function renderCalendar() {

    if (
        !calendarDaysContainer ||
        !calendarMonth
    ) {

        return;

    }


    const year =
        calendarDate.getFullYear();

    const month =
        calendarDate.getMonth();


    calendarMonth.textContent =
        `${calendarMonthNames[month]} ${year}`;


    calendarDaysContainer.innerHTML =
        "";


    // День недели первого числа.
    // JS: воскресенье = 0.
    // Нам нужен календарь с понедельника.
    let firstDay =
        new Date(
            year,
            month,
            1
        ).getDay();


    if (firstDay === 0) {
        firstDay = 7;
    }


    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


    const today =
        new Date();


    const todayKey =
        getCalendarDateKey(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        );


    const events =
        getCalendarEvents();


    // Пустые клетки
    for (
        let i = 1;
        i < firstDay;
        i++
    ) {

        const emptyDay =
            document.createElement(
                "div"
            );


        emptyDay.className =
            "calendar-day empty";


        calendarDaysContainer.appendChild(
            emptyDay
        );

    }


    // Дни
    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const dayButton =
            document.createElement(
                "button"
            );


        dayButton.type =
            "button";


        dayButton.className =
            "calendar-day";


        dayButton.textContent =
            day;


        const dateKey =
            getCalendarDateKey(
                year,
                month,
                day
            );


        dayButton.dataset.date =
            dateKey;


        // Сегодня
        if (
            dateKey ===
            todayKey
        ) {

            dayButton.classList.add(
                "today"
            );

        }


        // Событие
        if (
            events[dateKey]
        ) {

            dayButton.classList.add(
                "has-event"
            );


            dayButton.title =
                events[dateKey].text;

        }


        calendarDaysContainer.appendChild(
            dayButton
        );

    }

}


// ======================================================
// ПРЕДЫДУЩИЙ МЕСЯЦ
// ======================================================

prevMonthButton?.addEventListener(
    "click",
    () => {

        calendarDate.setMonth(
            calendarDate.getMonth() - 1
        );


        renderCalendar();

    }
);


// ======================================================
// СЛЕДУЮЩИЙ МЕСЯЦ
// ======================================================

nextMonthButton?.addEventListener(
    "click",
    () => {

        calendarDate.setMonth(
            calendarDate.getMonth() + 1
        );


        renderCalendar();

    }
);


// ======================================================
// ПЕРВЫЙ ЗАПУСК КАЛЕНДАРЯ
// ======================================================

renderCalendar();


// ======================================================
// НАЧАЛЬНАЯ НАСТРОЙКА
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
    .catch(
        error => {

            console.error(
                "Ошибка авторизации:",
                error
            );


            message.textContent =
                "Не удалось подключиться к Firebase 😔";

        }
    );


onAuthStateChanged(
    auth,
    async user => {

        if (!user) {
            return;
        }


        currentUser =
            user;


        // Восстанавливаем пару
        if (currentPairId) {

            await restorePair(
                currentPairId
            );

        }


        // Пришёл по приглашению
        else if (
            pendingInviteCode &&
            currentUserName &&
            currentUserGender
        ) {

            const code =
                pendingInviteCode;


            pendingInviteCode =
                null;


            await joinPairByCode(
                code
            );

        }

    }
);