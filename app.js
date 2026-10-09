const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}

let selectedMood = null;

const moodButtons = document.querySelectorAll(".mood");
const saveButton = document.getElementById("save-mood");
const message = document.getElementById("message");

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

saveButton.addEventListener("click", () => {

    if (!selectedMood) {
        message.textContent = "Сначала выбери настроение 💜";
        return;
    }

    localStorage.setItem(
        "ourMood",
        JSON.stringify(selectedMood)
    );

    message.textContent =
        `${selectedMood.emoji} Твоё настроение: ${selectedMood.text}`;

});

document.getElementById("create-pair").addEventListener(
    "click",
    () => {
        alert("Скоро здесь появится создание пары 💜");
    }
);

document.getElementById("join-pair").addEventListener(
    "click",
    () => {
        alert("Скоро здесь появится приглашение партнёра 💌");
    }
);

// Восстанавливаем настроение при повторном открытии.

const savedMood = localStorage.getItem("ourMood");

if (savedMood) {
    const mood = JSON.parse(savedMood);

    moodButtons.forEach(button => {
        if (button.dataset.mood === mood.text) {
            button.classList.add("selected");
            selectedMood = mood;
        }
    });
}





