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
    ...document.querySelectorAll(
        'input[name="gender"]'
    )
];

const message = $("message");

const partnerStatus = $("partner-status");

const sharePairButton = $("share-pair");


// ======================================================
// СОСТОЯНИЕ
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


// Код приглашения из Telegram
let pendingInviteCode =
    tg?.initDataUnsafe?.start_param || null;


// ======================================================
// ПРОФИЛЬ
// ======================================================

function openProfileModal(isEditing = false) {

    nameInput.value = currentUserName;


    genderInputs.forEach(input => {

        input.checked =
            input.value === currentUserGender;

    });


    const title =
        $("profile-modal-title");

    const subtitle =
        $("profile-modal-subtitle");


    // Если это изменение существующего профиля
    if (isEditing) {

        title.textContent =
            "Изменение профиля";

        subtitle.textContent =
            "Измени свои данные";

        nameSubmit.textContent =
            "Сохранить изменения →";

    }

    // Если это первый запуск
    else {

        title.textContent =
            "Добро пожаловать в OurMood!";

        subtitle.textContent =
            "Расскажи немного о себе";

        nameSubmit.textContent =
            "Продолжить →";

    }


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

        const baseMood =
            button.dataset.mood;

        const textElement =
            button.querySelector("small");


        if (
            textElement &&
            labels[baseMood]
        ) {

            textElement.textContent =
                labels[baseMood];

        }

    });

}


// ======================================================
// ТЕКСТ НАСТРОЕНИЯ ПАРТНЁРА
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
// СОХРАНЕНИЕ ПРОФИЛЯ В FIREBASE
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


    // Проверяем имя
    if (!name) {

        alert(
            "Пожалуйста, введи своё имя 💜"
        );

        nameInput.focus();

        return;

    }


    // Проверяем пол
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


    // Сохраняем локально
    localStorage.setItem(
        "ourMoodName",
        currentUserName
    );


    localStorage.setItem(
        "ourMoodGender",
        currentUserGender
    );


    // Обновляем названия настроений
    updateMoodButtons();


    try {

        // Если пользователь уже состоит в паре
        // обновляем профиль в Firebase
        if (
            currentUser &&
            currentPairId
        ) {

            await saveProfileToPair();

        }


        // Закрываем окно
        closeProfileModal();


        // Если пользователь пришёл
        // по ссылке приглашения
        if (
            pendingInviteCode &&
            currentUser
        ) {

            const code =
                pendingInviteCode;


            pendingInviteCode = null;


            await joinPairByCode(code);

        }

    }

    catch (error) {

        console.error(
            "Ошибка сохранения профиля:",
            error
        );


        message.textContent =
            "Не удалось обновить профиль в паре.";

    }

}


// ======================================================
// КНОПКА ПРОФИЛЯ
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


// ======================================================
// ИЗМЕНИТЬ ПРОФИЛЬ
// ======================================================

$("change-profile").addEventListener(
    "click",
    () => {

        openProfileModal(true);

    }
);


// ======================================================
// ГЕНЕРАЦИЯ КОДА ПАРЫ
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

function listenToPair(pairId) {

    // Удаляем старый listener
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
                    snapshot.data().members || {};


                const ids =
                    Object.keys(members);


                const partnerId =
                    ids.find(
                        id =>
                            id !== currentUser?.uid
                    );


                // Партнёра пока нет
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


                // Партнёр выбрал настроение
                if (partner.mood) {

                    partnerStatus.textContent =
                        `${partner.mood.emoji || "💜"} ${partnerName}: ${getMoodText(
                            partner.mood.text,
                            partner.gender
                        )}`;

                }

                // Партнёр ещё ничего не выбрал
                else {

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
                doc(
                    db,
                    "pairs",
                    pairId
                )
            );


        // Пары больше нет
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


        // Пользователя больше нет в паре
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


        currentPairId =
            pairId;


        sharePairButton.style.display =
            "block";


        listenToPair(pairId);

    }

    catch (error) {

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


        // Если профиль не заполнен
        if (
            !currentUserName ||
            !currentUserGender
        ) {

            openProfileModal();

            return;

        }


        // Уже есть пара
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


            // Проверяем, не занят ли код
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


            // Создаём пару
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

        }

        catch (error) {

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

async function joinPairByCode(rawCode) {

    // Firebase ещё не готов
    if (!currentUser) {

        pendingInviteCode =
            rawCode;

        return;

    }


    // Нет профиля
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


        // Такой пары нет
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
        if (
            members[currentUser.uid]
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


        // В паре уже два человека
        if (ids.length >= 2) {

            alert(
                "В этой паре уже есть два человека 💜"
            );

            return;

        }


        // Добавляем второго пользователя
        await updateDoc(
            pairRef,
            {

                [`members.${currentUser.uid}`]:
                {

                    name:
                        currentUserName,

                    gender:
                        currentUserGender,

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

    }

    catch (error) {

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

            await joinPairByCode(
                code
            );

        }

    }
);


// ======================================================
// ПОКИНУТЬ ПАРУ
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

        }

        catch (error) {

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
// ВЫБОР НАСТРОЕНИЯ
// ======================================================

moodButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                // Убираем выделение
                // с остальных кнопок
                moodButtons.forEach(
                    item => {

                        item.classList.remove(
                            "selected"
                        );

                    }
                );


                // Выделяем выбранную
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


                message.textContent =
                    "";

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


            // Сохраняем настроение локально
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

        }

        catch (error) {

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

        }

        else {

            try {

                await navigator.clipboard.writeText(
                    inviteLink
                );


                alert(
                    "Ссылка-приглашение скопирована 💌"
                );

            }

            catch {

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
                        .querySelector("span")
                        .textContent,

                text:
                    button.dataset.mood

            };

        }

    }

}

catch (error) {

    console.warn(
        "Не удалось восстановить настроение:",
        error
    );

}


// ======================================================
// НАЧАЛЬНАЯ НАСТРОЙКА
// ======================================================

updateMoodButtons();


if (
    currentUserName &&
    currentUserGender
) {

    closeProfileModal();

}

else {

    openProfileModal();

}


// ======================================================
// АВТОРИЗАЦИЯ FIREBASE
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


        currentUser =
            user;


        // Восстанавливаем существующую пару
        if (currentPairId) {

            await restorePair(
                currentPairId
            );

        }


        // Если пришёл по приглашению
        // и профиль уже заполнен
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