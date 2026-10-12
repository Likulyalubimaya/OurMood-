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
// NOTIFICATIONS
// ======================================================

const NOTIFICATION_FUNCTION_URL =
    "https://ourmood-notifications.vercel.app/api/notify";


// ======================================================
// HELPER
// ======================================================

const $ = id => document.getElementById(id);


// ======================================================
// DOM
// ======================================================

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
// STATE
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

let pendingInviteCode =
    tg?.initDataUnsafe?.start_param || null;


// ======================================================
// CALENDAR STATE
// ======================================================

// Все события теперь берутся из Firebase.
// Благодаря этому оба участника видят один календарь.

let calendarEvents = {};

let selectedCalendarDate = null;

let calendarDate = new Date();


// ======================================================
// NOTIFY PARTNER
// ======================================================

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
// MENU
// ======================================================

const menuButton = $("menu-button");
const closeMenuButton = $("close-menu");
const sideMenu = $("side-menu");
const menuOverlay = $("menu-overlay");


function openMenu() {

    sideMenu?.classList.add("open");

    menuOverlay?.classList.add("open");
}


function closeMenu() {

    sideMenu?.classList.remove("open");

    menuOverlay?.classList.remove("open");
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
// PROFILE
// ======================================================

function openProfileModal(isEditing = false) {

    if (!nameModal || !nameInput) {
        return;
    }

    nameInput.value = currentUserName;

    genderInputs.forEach(input => {

        input.checked =
            input.value === currentUserGender;

    });


    const title =
        $("profile-modal-title");

    const subtitle =
        $("profile-modal-subtitle");


    if (isEditing) {

        if (title) {
            title.textContent =
                "Изменение профиля";
        }

        if (subtitle) {
            subtitle.textContent =
                "Измени свои данные";
        }

        if (nameSubmit) {
            nameSubmit.textContent =
                "Сохранить изменения →";
        }

    } else {

        if (title) {
            title.textContent =
                "Добро пожаловать в OurMood!";
        }

        if (subtitle) {
            subtitle.textContent =
                "Расскажи немного о себе";
        }

        if (nameSubmit) {
            nameSubmit.textContent =
                "Продолжить →";
        }

    }


    nameModal.classList.remove("hidden");


    setTimeout(() => {

        nameInput.focus();

    }, 100);

}


function closeProfileModal() {

    nameModal?.classList.add("hidden");

}


// ======================================================
// MOOD LABELS
// ======================================================

function updateMoodButtons() {

    const female =
        currentUserGender === "female";


    const labels = {

        "Счастлив":
            female ? "Счастлива" : "Счастлив",

        "Влюблён":
            female ? "Влюблена" : "Влюблён",

        "Устал":
            female ? "Устала" : "Устал"

    };


    moodButtons.forEach(button => {

        const label =
            button.querySelector("small");

        if (
            label &&
            labels[button.dataset.mood]
        ) {

            label.textContent =
                labels[button.dataset.mood];

        }

    });

}


// ======================================================
// PARTNER MOOD TEXT
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
// COUPLE AVATAR
// ======================================================

// ======================================================
// COUPLE AVATAR
// ======================================================

function updateCoupleAvatar(members) {

    const avatar = $("couple-avatar");

    if (!avatar) {
        console.warn("⚠️ Элемент couple-avatar не найден");
        return;
    }

    const users = Object.values(members || {});

    // Пока партнёра нет
    if (users.length < 2) {
        avatar.textContent = "💜";
        return;
    }

    const maleCount =
        users.filter(user => user.gender === "male").length;

    const femaleCount =
        users.filter(user => user.gender === "female").length;


    // 👨 + 👨
    if (maleCount === 2) {
        avatar.textContent = "👨‍❤️‍👨";
        return;
    }


    // 👩 + 👩
    if (femaleCount === 2) {
        avatar.textContent = "👩‍❤️‍👩";
        return;
    }


    // 👨 + 👩
    if (
        maleCount === 1 &&
        femaleCount === 1
    ) {
        avatar.textContent = "👩‍❤️‍👨";
        return;
    }


    // Если данные почему-то неполные
    avatar.textContent = "💜";
}


// ======================================================
// SAVE PROFILE TO PAIR
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
// SAVE USER PROFILE
// ======================================================

async function saveUserProfile() {

    const name =
        nameInput?.value.trim();

    const gender =
        document.querySelector(
            'input[name="gender"]:checked'
        );


    if (!name) {

        alert(
            "Пожалуйста, введи своё имя 💜"
        );

        nameInput?.focus();

        return;
    }


    if (!gender) {

        alert(
            "Пожалуйста, выбери пол 💜"
        );

        return;
    }


    currentUserName =
        name.slice(0, 20);

    currentUserGender =
        gender.value;


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

            pendingInviteCode = null;

            await joinPairByCode(code);

        }

    } catch (error) {

        console.error(
            "Ошибка сохранения профиля:",
            error
        );

        if (message) {

            message.textContent =
                "Не удалось обновить профиль в паре.";

        }

    }

}


nameSubmit?.addEventListener(
    "click",
    saveUserProfile
);


nameInput?.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            saveUserProfile();

        }

    }
);


$("change-profile")?.addEventListener(
    "click",
    () => {

        closeMenu();

        openProfileModal(true);

    }
);


// ======================================================
// PAIR CODE
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
// CALENDAR DATE KEY
// ======================================================

function getCalendarDateKey(
    year,
    month,
    day
) {

    return `${year}-${String(
        month + 1
    ).padStart(2, "0")}-${String(
        day
    ).padStart(2, "0")}`;

}


// ======================================================
// LISTEN TO PAIR
// ======================================================

// ======================================================
// LISTEN TO PAIR
// ======================================================

function listenToPair(pairId) {

    if (stopListening) {
        stopListening();
        stopListening = null;
    }

    console.log("👂 Начинаем слушать пару:", pairId);

    const pairRef = doc(
        db,
        "pairs",
        pairId
    );

    stopListening = onSnapshot(
        pairRef,

        snapshot => {

            console.log(
                "🔥 Получено обновление пары:",
                snapshot.data()
            );

            if (!snapshot.exists()) {

                partnerStatus.textContent =
                    "Пара не найдена. Создай новую или подключись снова.";

                calendarEvents = {};

                renderCalendar();

                return;
            }

            const pairData = snapshot.data();
            const relationshipDate =
    pairData.relationshipStartDate || "";

renderRelationshipCounter(relationshipDate);

if (relationshipDateInput) {
    relationshipDateInput.value = relationshipDate;
    relationshipDateInput.max = getTodayDateString();
}

            // ==========================================
            // КАЛЕНДАРЬ
            // ==========================================

            const firebaseEvents =
                pairData.events || {};

            console.log(
                "📅 События из Firebase:",
                firebaseEvents
            );

            calendarEvents = {
                ...firebaseEvents
            };

            renderCalendar();


            // ==========================================
            // ПАРТНЁР
            // ==========================================

            const members =
                pairData.members || {};
            updateCoupleAvatar(members);

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
                partner.name || "Партнёр";

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
                "❌ Ошибка слушателя пары:",
                error
            );

            partnerStatus.textContent =
                "Не удалось обновить данные пары.";

        }
    );
}


// ======================================================
// RESTORE PAIR
// ======================================================

async function restorePair(pairId) {

    try {

        const snap =
            await getDoc(
                doc(
                    db,
                    "pairs",
                    pairId
                )
            );


        if (
            !snap.exists() ||
            !snap.data().members?.[currentUser.uid]
        ) {

            localStorage.removeItem(
                "ourMoodPairId"
            );

            currentPairId = null;

            calendarEvents = {};

            renderCalendar();

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
// CREATE PAIR
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

            let code =
                generatePairCode();

            let ref =
                doc(
                    db,
                    "pairs",
                    code
                );


            while (
                (await getDoc(ref)).exists()
            ) {

                code =
                    generatePairCode();

                ref =
                    doc(
                        db,
                        "pairs",
                        code
                    );

            }


            await setDoc(

                ref,

                {

                    code,

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

                    // ВАЖНО:
                    // теперь события календаря
                    // находятся внутри пары.

                    events: {},

                    createdAt:
                        Date.now()

                }

            );


            currentPairId =
                code;


            localStorage.setItem(
                "ourMoodPairId",
                code
            );


            sharePairButton.style.display =
                "block";


            partnerStatus.textContent =
                "Ожидаем партнёра 💌";


            calendarEvents = {};

            renderCalendar();


            listenToPair(code);


            alert(
                `Ваша пара создана! 💜\n\nКод для партнёра:\n${code}`
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


 // =========================
// ДАННЫЕ ПАРЫ
// =========================

const pairDataModal = $("pair-data-modal");
const pairDataButton = $("pair-data");
const pairDataClose = $("pair-data-close");
const relationshipDateInput = $("relationship-date");
const saveRelationshipDateButton = $("save-relationship-date");
const relationshipDateMessage = $("relationship-date-message");

const relationshipCounter = $("relationship-counter");
const relationshipCounterTitle = $("relationship-counter-title");
const relationshipCounterDays = $("relationship-counter-days");
const relationshipCounterDate = $("relationship-counter-date");

// Сегодня в локальном формате YYYY-MM-DD
function getTodayDateString() {
    const today = new Date();

    return [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");
}

// Правильное склонение слова "день"
function getDaysWord(days) {
    const lastTwo = days % 100;
    const last = days % 10;

    if (lastTwo >= 11 && lastTwo <= 14) {
        return "дней";
    }

    if (last === 1) {
        return "день";
    }

    if (last >= 2 && last <= 4) {
        return "дня";
    }

    return "дней";
}

// Отображение счётчика отношений
function renderRelationshipCounter(date) {
    if (
        !relationshipCounter ||
        !relationshipCounterTitle ||
        !relationshipCounterDays ||
        !relationshipCounterDate
    ) {
        return;
    }

    if (!date) {
        relationshipCounter.hidden = true;
        return;
    }

    const todayString = getTodayDateString();

    if (date > todayString) {
        relationshipCounter.hidden = true;
        return;
    }

    const start = new Date(date + "T12:00:00");
    const today = new Date(todayString + "T12:00:00");

    const days = Math.round(
        (today.getTime() - start.getTime()) / 86400000
    );

    if (!Number.isFinite(days) || days < 0) {
        relationshipCounter.hidden = true;
        return;
    }

    relationshipCounterTitle.textContent =
        days === 0 ? "Сегодня начало вашей истории 💜" : "Вы вместе";

    relationshipCounterDays.textContent =
        `${days} ${getDaysWord(days)}`;

    relationshipCounterDate.textContent =
        "Начало отношений: " +
        start.toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });

    relationshipCounter.hidden = false;
}

// Открытие окна
pairDataButton?.addEventListener("click", async () => {
    closeMenu();

    if (!currentPairId) {
        relationshipDateMessage.textContent =
            "Сначала создайте пару или подключитесь к партнёру 💜";

        relationshipDateInput.value = "";
        relationshipDateInput.max = getTodayDateString();
        renderRelationshipCounter(null);

        pairDataModal?.classList.add("open");
        return;
    }

    try {
        relationshipDateMessage.textContent = "Загружаем данные...";

        const pairRef = doc(db, "pairs", currentPairId);
        const snapshot = await getDoc(pairRef);

        if (!snapshot.exists()) {
            relationshipDateMessage.textContent =
                "Пара не найдена. Попробуйте подключиться снова.";
            return;
        }

        const pairData = snapshot.data();
        const date = pairData.relationshipStartDate || "";

        relationshipDateInput.max = getTodayDateString();
        relationshipDateInput.value = date;

        renderRelationshipCounter(date);

        relationshipDateMessage.textContent = "";
        pairDataModal?.classList.add("open");
    } catch (error) {
        console.error("Ошибка загрузки данных пары:", error);

        relationshipDateMessage.textContent =
            "Не удалось загрузить данные 😔";
    }
});

// Закрытие окна
pairDataClose?.addEventListener("click", () => {
    pairDataModal?.classList.remove("open");
});

pairDataModal?.addEventListener("click", event => {
    if (event.target === pairDataModal) {
        pairDataModal.classList.remove("open");
    }
});

// Сохранение даты
saveRelationshipDateButton?.addEventListener("click", async () => {
    if (!currentUser || !currentPairId) {
        relationshipDateMessage.textContent =
            "Сначала создайте пару или подключитесь к партнёру 💜";
        return;
    }

    const date = relationshipDateInput.value;

    if (!date) {
        relationshipDateMessage.textContent =
            "Выберите дату начала отношений 📅";
        return;
    }

    if (date > getTodayDateString()) {
        relationshipDateMessage.textContent =
            "Нельзя выбрать дату из будущего 💜";
        return;
    }

    try {
        saveRelationshipDateButton.disabled = true;
        relationshipDateMessage.textContent = "Сохраняем дату...";

        await updateDoc(
            doc(db, "pairs", currentPairId),
            { relationshipStartDate: date }
        );

        renderRelationshipCounter(date);

        relationshipDateMessage.textContent =
            "Дата сохранена для вас обоих 💜";
    } catch (error) {
        console.error("Ошибка сохранения даты:", error);

        relationshipDateMessage.textContent =
            "Не удалось сохранить дату 😔";
    } finally {
        saveRelationshipDateButton.disabled = false;
    }
});

// ======================================================
// JOIN PAIR
// ======================================================

async function joinPairByCode(rawCode) {

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


    const code =
        String(rawCode)
            .trim()
            .toUpperCase();


    if (!code) {
        return;
    }


    try {

        const ref =
            doc(
                db,
                "pairs",
                code
            );


        const snap =
            await getDoc(ref);


        if (!snap.exists()) {

            alert(
                "Такой пары не существует 😔"
            );

            return;

        }


        const members =
            snap.data().members || {};


        const ids =
            Object.keys(members);


        if (members[currentUser.uid]) {

            currentPairId =
                code;


            localStorage.setItem(
                "ourMoodPairId",
                code
            );


            await saveProfileToPair();


            sharePairButton.style.display =
                "block";


            listenToPair(code);

            return;

        }


        if (ids.length >= 2) {

            alert(
                "В этой паре уже есть два человека 💜"
            );

            return;

        }


        await updateDoc(

            ref,

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
            code;


        localStorage.setItem(
            "ourMoodPairId",
            code
        );


        sharePairButton.style.display =
            "block";


        listenToPair(code);


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


$("join-pair")?.addEventListener(
    "click",
    async () => {

        closeMenu();


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
// LEAVE PAIR
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


            stopListening = null;


            localStorage.removeItem(
                "ourMoodPairId"
            );


            currentPairId = null;


            calendarEvents = {};

            renderCalendar();


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
// MOOD SELECTION
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
// SAVE MOOD
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
// INVITE
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
// RESTORE MOOD
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
// CALENDAR DOM
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
// OPEN EVENT MODAL
// ======================================================

function openEventModal(date) {

    if (!eventModal) {
        return;
    }


    selectedCalendarDate =
        date;


    const dateObject =
        new Date(
            `${date}T12:00:00`
        );


    if (eventModalDate) {

        eventModalDate.textContent =
            dateObject.toLocaleDateString(
                "ru-RU",
                {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            );

    }


    if (customEventBlock) {

        customEventBlock.classList.remove(
            "open"
        );

    }


    if (customEventInput) {

        customEventInput.value = "";

    }


    const title =
        $("event-modal-title");


    if (title) {

        if (
            calendarEvents[date]
        ) {

            title.textContent =
                `Событие: ${calendarEvents[date].text}`;

        } else {

            title.textContent =
                "Выбери событие";

        }

    }


    eventModal.classList.add(
        "open"
    );

}


// ======================================================
// CLOSE EVENT MODAL
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


    const title =
        $("event-modal-title");


    if (title) {

        title.textContent =
            "Выбери событие";

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
            event.target === eventModal
        ) {

            closeEventModal();

        }

    }
);


// ======================================================
// SAVE CALENDAR EVENT TO FIRESTORE
// ======================================================

async function saveCalendarEvent(
    date,
    eventData
) {

    const calendarMessage =
        $("calendar-message");


    if (!currentUser) {

        if (calendarMessage) {

            calendarMessage.textContent =
                "Подключаемся к серверу...";

        }

        return;

    }


    if (!currentPairId) {

        if (calendarMessage) {

            calendarMessage.textContent =
                "Сначала создай или подключи пару 💌";

        }

        return;

    }


    try {

        const value = {

            type:
                String(
                    eventData.type ||
                    "custom"
                ),

            text:
                String(
                    eventData.text ||
                    "✏️ Отметка"
                ),

            author:
                currentUserName ||
                "Участник",

            authorId:
                currentUser.uid,

            createdAt:
                Date.now()

        };


        // ==================================================
        // ВАЖНО:
        // сохраняем событие прямо в документе пары.
        //
        // events:
        // {
        //     "2026-10-12": {...},
        //     "2026-10-20": {...}
        // }
        //
        // Поэтому партнёр получит его через onSnapshot.
        // ==================================================

        await updateDoc(

    doc(
        db,
        "pairs",
        currentPairId
    ),

    {
        [`events.${date}`]: value
    }

);

console.log(
    "✅ Событие записано в Firebase:",
    date,
    value
);


        if (calendarMessage) {

            calendarMessage.textContent =
                "Событие сохранено для вас обоих 💜";

        }


        closeEventModal();


    } catch (error) {

        console.error(
            "Ошибка сохранения события календаря:",
            error
        );


        if (calendarMessage) {

            calendarMessage.textContent =
                "Не удалось сохранить событие 😔";

        }

    }

}


// ======================================================
// EVENT BUTTONS
// ======================================================

eventOptions.forEach(
    button => {

        button.addEventListener(
            "click",
            async function () {

                const type =
                    this.dataset.event;


                if (type === "custom") {

                    customEventBlock?.classList.add(
                        "open"
                    );


                    setTimeout(
                        () =>
                            customEventInput?.focus(),
                        100
                    );


                    return;

                }


                if (!selectedCalendarDate) {
                    return;
                }


                await saveCalendarEvent(

                    selectedCalendarDate,

                    {

                        type,

                        text:
                            calendarEventNames[type] ||
                            "📅 Событие"

                    }

                );

            }
        );

    }
);


// ======================================================
// CUSTOM EVENT
// ======================================================

saveCustomEvent?.addEventListener(
    "click",
    async () => {

        const text =
            customEventInput?.value.trim();


        if (!text) {

            customEventInput?.focus();

            return;

        }


        if (!selectedCalendarDate) {
            return;
        }


        await saveCalendarEvent(

            selectedCalendarDate,

            {

                type: "custom",

                text:
                    `✏️ ${text}`

            }

        );

    }
);


customEventInput?.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            saveCustomEvent?.click();

        }

    }
);


// ======================================================
// CALENDAR CLICK
// ======================================================

calendarDaysContainer?.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".calendar-day"
            );


        if (!button) {
            return;
        }


        if (
            button.classList.contains(
                "empty"
            )
        ) {
            return;
        }


        if (button.dataset.date) {

            openEventModal(
                button.dataset.date
            );

        }

    }
);


// ======================================================
// RENDER CALENDAR
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


    // Пустые клетки перед первым днём
    for (
        let i = 1;
        i < firstDay;
        i++
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "calendar-day empty";


        calendarDaysContainer.appendChild(
            empty
        );

    }


    // Дни месяца
    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.className =
            "calendar-day";


        button.textContent =
            day;


        const dateKey =
            getCalendarDateKey(
                year,
                month,
                day
            );


        button.dataset.date =
            dateKey;


        // Сегодня
        if (
            dateKey === todayKey
        ) {

            button.classList.add(
                "today"
            );

        }


        // ==============================================
        // СОБЫТИЕ
        // ==============================================

        const eventData =
            calendarEvents[dateKey];


        if (eventData) {

            button.classList.add(
                "has-event"
            );


            button.title =
                eventData.text ||
                "Событие";


            button.setAttribute(
                "aria-label",
                `${day}, ${
                    eventData.text ||
                    "есть событие"
                }`
            );

        }


        calendarDaysContainer.appendChild(
            button
        );

    }

}


// ======================================================
// CALENDAR MONTH NAVIGATION
// ======================================================

prevMonthButton?.addEventListener(
    "click",
    () => {

        calendarDate.setDate(1);

        calendarDate.setMonth(
            calendarDate.getMonth() - 1
        );

        renderCalendar();

    }
);


nextMonthButton?.addEventListener(
    "click",
    () => {

        calendarDate.setDate(1);

        calendarDate.setMonth(
            calendarDate.getMonth() + 1
        );

        renderCalendar();

    }
);


// ======================================================
// INITIAL CALENDAR
// ======================================================

renderCalendar();


// ======================================================
// PROFILE INITIAL STATE
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
// FIREBASE AUTH
// ======================================================

signInAnonymously(auth)
    .catch(error => {

        console.error(
            "Ошибка авторизации:",
            error
        );


        if (message) {

            message.textContent =
                "Не удалось подключиться к Firebase 😔";

        }

    });


onAuthStateChanged(
    auth,
    async user => {

        if (!user) {
            return;
        }


        currentUser =
            user;


        if (currentPairId) {

            await restorePair(
                currentPairId
            );

        } else if (
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