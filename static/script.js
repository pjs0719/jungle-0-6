function logout() {
    alert("로그아웃되었습니다.");
    window.location.href = "/logout";
}

document.addEventListener("DOMContentLoaded", function () {
    const days = document.querySelectorAll(".days li a");
    const uiSection = document.querySelector(".ui-section");

    function formatDate(year, month, day) {
        const monthStr = month.toString().padStart(2, '0');
        const dayStr = day.toString().padStart(2, '0');
        return `${year}-${monthStr}-${dayStr}`;
    }

    function handleDateSelection(event) {
        event.preventDefault();
        const dayElement = event.target;
        const year = dayElement.dataset.year;
        const month = dayElement.dataset.month;
        const day = dayElement.dataset.day;
        const dateKey = formatDate(year, month, day);

        fetch(`/diary?dateKey=${dateKey}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('일기 데이터를 가져오는데 실패했습니다.');
                }
                return response.json();
            })
            .then(data => {
                let savedData;
                if (data && data.date) {
                    savedData = {
                        ...data,
                        editMode: false
                    };
                } else {
                    savedData = {
                        title: "",
                        content: "",
                        mood: "",
                        editMode: true,
                        date: dateKey
                    };
                }
                renderUI(savedData);
            })
            .catch(error => {
                console.error("Error fetching diary:", error);
                uiSection.innerHTML = `<p class="has-text-danger">일기 데이터를 가져오는 데 실패했습니다: ${error.message}</p>`;
            });
    }

    function renderUI(savedData) {
        const {
            year,
            month,
            day
        } = parseDate(savedData.date);
        if (savedData.editMode) {
            uiSection.innerHTML = `
                <h2 class="title is-3">${year}년 ${month}월 ${day}일</h2>
                <div class="field">
                    <label class="label">제목</label>
                    <div class="control">
                        <input class="input" type="text" id="diary-title" value="${savedData.title || ''}" required>
                    </div>
                </div>
                <div class="field">
                    <label class="label">내용</label>
                    <div class="control" style="height: 300px; overflow-y: auto;">
                        <textarea class="textarea" id="diary-content" style="height: 100%;" required>${savedData.content || ''}</textarea>
                    </div>
                </div>
                <div class="field">
                    <label class="label">오늘의 기분</label>
                    <div class="buttons">
                        <button class="button mood-btn ${savedData.mood === 'happy' ? 'is-success' : ''}" data-mood="happy">😊 행복</button>
                        <button class="button mood-btn ${savedData.mood === 'neutral' ? 'is-warning' : ''}" data-mood="neutral">😐 보통</button>
                        <button class="button mood-btn ${savedData.mood === 'sad' ? 'is-info' : ''}" data-mood="sad">😢 슬픔</button>
                    </div>
                </div>
                <div class="field is-grouped is-pulled-right">
                    <div class="control">
                        <button class="button is-danger" id="delete-btn">삭제</button>
                    </div>
                    <div class="control">
                        <button class="button is-link" id="save-btn">저장</button>
                    </div>
                </div>
            `;

            document.querySelectorAll(".mood-btn").forEach(button => {
                button.addEventListener("click", function () {
                    document.querySelectorAll(".mood-btn").forEach(btn => btn.classList.remove("is-success", "is-warning", "is-info"));
                    this.classList.add(this.dataset.mood === "happy" ? "is-success" : this.dataset.mood === "neutral" ? "is-warning" : "is-info");
                    savedData.mood = this.dataset.mood;
                });
            });

            function refreshCalendar(year, month, day) {
                fetch(`/?year=${year}&month=${month}&partial=true`)
                    .then(response => response.text())
                    .then(html => {
                        const parser = new DOMParser();
                        const newDoc = parser.parseFromString(html, 'text/html');
                        const newCalendar = newDoc.querySelector('.calendar-section');

                        document.querySelector('.calendar-section').outerHTML = newCalendar.innerHTML;

                        const targetDate = document.querySelector(
                            `a[data-year="${year}"][data-month="${month}"][data-day="${day}"]`
                        );
                        if (targetDate) {
                            targetDate.parentElement.classList.add('highlight');
                            targetDate.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center'
                            });
                        }

                        document.querySelectorAll(".days li a").forEach(day => {
                            day.addEventListener("click", handleDateSelection);
                        });
                    });
            }

            document.getElementById("save-btn").addEventListener("click", function () {
                savedData.title = document.getElementById("diary-title").value;
                savedData.content = document.getElementById("diary-content").value;

                fetch('/diary', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(savedData)
                })
                    .then(response => {
                        if (!response.ok) throw new Error('일기 저장 실패');
                        return response.json();
                    })
                    .then(data => {
                        alert(data.message);
                        const {
                            year,
                            month,
                            day
                        } = parseDate(savedData.date);
                        refreshCalendar(year, month, day);
                        renderUI({
                            ...savedData,
                            editMode: false
                        });
                    })
                    .catch(error => {
                        console.error("Error:", error);
                        alert(`저장 실패: ${error.message}`);
                    });
            });

            document.getElementById("delete-btn").addEventListener("click", function () {
                fetch(`/diary?dateKey=${savedData.date}`, {
                    method: 'DELETE'
                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('일기 삭제에 실패했습니다.');
                        }
                        return response.json();
                    })
                    .then(data => {
                        alert(data.message);
                        uiSection.innerHTML = `<p>일기가 삭제되었습니다.</p>`;
                    })
                    .catch(error => {
                        console.error("Error deleting diary:", error);
                        alert('일기 삭제에 실패했습니다: ' + error.message);
                    });
            });
        } else {
            uiSection.innerHTML = `
                <h2 class="title is-3">${year}년 ${month}월 ${day}일</h2>
                <div class="content">
                    <h3>${savedData.title || "제목 없음"}</h3>
                    <p>${savedData.content || "내용 없음"}</p>
                    <p>기분: ${savedData.mood || "미정"}</p>
                </div>
                <button class="button is-link" id="edit-btn">수정</button>
            `;

            document.getElementById("edit-btn").addEventListener("click", function () {
                savedData.editMode = true;
                renderUI(savedData);
            });
        }
    }

    function parseDate(dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        return {
            year,
            month,
            day
        };
    }

    days.forEach(day => {
        day.addEventListener("click", handleDateSelection);
    });
});
