// 로그아웃 처리 함수: 로그아웃 후 로그인 페이지로 이동
function logout() {
    alert("로그아웃되었습니다.");
    window.location.href = "/logout";
}

// DOM 콘텐츠 로딩 완료 시 실행되는 이벤트 리스너
document.addEventListener("DOMContentLoaded", function () {
    const days = document.querySelectorAll(".days li a"); // 날짜 요소들 가져오기
    const uiSection = document.querySelector(".ui-section"); // 일기 내용을 표시할 UI 섹션

    // 날짜를 'YYYY-MM-DD' 형식으로 변환하는 함수
    function formatDate(year, month, day) {
        const monthStr = month.toString().padStart(2, '0');
        const dayStr = day.toString().padStart(2, '0');
        return `${year}-${monthStr}-${dayStr}`;
    }

    // 날짜 선택 시 서버에서 해당 일기의 데이터를 가져오는 함수
    function handleDateSelection(event, selectedDate = null) {
        if (event) event.preventDefault(); // 기본 이벤트 방지 (링크 이동 방지)
    
        const dateKey = selectedDate || formatDate(
            event.target.dataset.year, 
            event.target.dataset.month, 
            event.target.dataset.day
        );
    
        fetch(`/diary?dateKey=${dateKey}`)
            .then(response => response.json())
            .then(data => {
                let savedData;
                if (data && data.date) {
                    savedData = {
                        ...data,
                        editMode: false
                    };  // 기존 일기 데이터가 있으면 편집 모드 비활성화
                } else {
                    savedData = {
                        title: "",
                        content: "",
                        mood: "",
                        editMode: true,
                        date: dateKey
                    };
                 } // 없으면 새 일기 작성 모드 활성화
                renderUI(savedData); // UI 렌더링 호출
            })
            .catch(error => {
                console.error("❌ Error fetching diary:", error);
            });
    }
    window.handleDateSelection = handleDateSelection; // 전역에서 접근 가능하도록 설정

    // 일기 데이터를 기반으로 UI를 렌더링하는 함수 (편집 모드 및 조회 모드 지원)
    function renderUI(savedData) {
        const { year, month, day } = parseDate(savedData.date);
        if (savedData.editMode) { // 편집 가능한 폼을 표시하는 부분
            uiSection.innerHTML = ` 
             <div style="display: flex; flex-direction: column; height: 95vh; overflow: hidden;">
    <h2 class="title is-3" style="flex-shrink: 0;">${year}년 ${month}월 ${day}일</h2>
    <div class="field" style="flex-shrink: 0;">
        <label class="label">제목</label>
        <div class="control">
            <input class="input" type="text" id="diary-title" value="${savedData.title || ''}" required>
        </div>
    </div>
    <div class="field" style="flex-grow: 1; display: flex; flex-direction: column; min-height: 0;">
        <label class="label" style="flex-shrink: 0;">내용</label>
        <div class="control" style="flex-grow: 1; min-height: 0;">
            <textarea class="textarea" id="diary-content" style="height: 90%; resize: none; overflow-y: auto;" required>${savedData.content || ''}</textarea>
        </div>
    </div>
    <div class="field" style="flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;">
        <div class="buttons" style="display: flex; align-items: center;">
            <button class="button mood-btn ${savedData.mood === 'happy' ? 'is-success' : ''}" data-mood="happy">😊 행복</button>
            <button class="button mood-btn ${savedData.mood === 'neutral' ? 'is-warning' : ''}" data-mood="neutral">😐 보통</button>
            <button class="button mood-btn ${savedData.mood === 'sad' ? 'is-info' : ''}" data-mood="sad">😢 슬픔</button>
        </div>
        <div class="field is-grouped" style="display: flex; align-items: center;">
            <div class="control">
                <button class="button is-danger" id="delete-btn">삭제</button>
            </div>
            <div class="control">
                <button class="button is-link" id="save-btn">저장</button>
            </div>
        </div>
    </div>
</div>



            `;

            // 기분 버튼 클릭 이벤트 처리
            document.querySelectorAll(".mood-btn").forEach(button => {
                button.addEventListener("click", function () {
                    document.querySelectorAll(".mood-btn").forEach(btn => btn.classList.remove("is-success", "is-warning", "is-info"));
                    this.classList.add(this.dataset.mood === "happy" ? "is-success" : this.dataset.mood === "neutral" ? "is-warning" : "is-info");
                    savedData.mood = this.dataset.mood;
                });
            });

            // 저장 버튼 클릭 시 서버에 일기 저장 요청 및 캘린더 갱신
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
                        refreshCalendar(year, month, day);  // 캘린더 새로고침
                        renderUI({ ...savedData, editMode: false }); // 저장 후 조회 모드로 전환
                    })
                    .catch(error => {
                        console.error("Error:", error);
                        alert(`저장 실패: ${error.message}`);
                    });
            });

            // 삭제 버튼 클릭 시 서버에 일기 삭제 요청 및 페이지 초기화
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
                        window.location.href = "/home"; // 홈으로 이동하여 초기 상태로 복귀
                    })
                    .catch(error => {
                        console.error("Error deleting diary:", error);
                        alert('일기 삭제에 실패했습니다: ' + error.message);
                    });
            });

        } else {  // 조회 모드에서 일기 내용을 표시하는 부분
            uiSection.innerHTML = `   
                <h2 class="title is-3" style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">
    ${year}년 ${month}월 ${day}일
</h2>
<div class="content" style="height: 80vh; display: flex; flex-direction: column;">
    <h3 style="font-size: 1.2rem; margin: 0;">
        ${savedData.title || "제목 없음"}
    </h3>
    <hr style="border: none; border-top: 2px solid #000; margin: 0.5rem 0;">
    <p style="margin: 0; flex-grow: 1; overflow-y: auto;">
        ${savedData.content || "내용 없음"}
    </p>
    <hr style="border: none; border-top: 2px solid #000; margin: 0.5rem 0;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <p style="margin: 0; font-size: 1.5rem;">
        기분 : 
            <span style="font-size: 3rem;">
                ${savedData.mood === 'happy' ? '😊' : savedData.mood === 'neutral' ? '😐' : savedData.mood === 'sad' ? '😢' : '미정'}
            </span>
        </p>
        <button class="button is-link" id="edit-btn"
            style="margin-left: auto; color: #000000; border: none; padding: 0.5rem 1rem; cursor: pointer; background: none; font-size: 2rem;">
            ✎
        </button>
    </div>
</div>


            `;

            document.getElementById("edit-btn").addEventListener("click", function () {
                savedData.editMode = true;
                renderUI(savedData);
            });
        }
    }

    // 왼쪽 캘린더 부분을 새로고침하는 함수
    function refreshCalendar(year, month, day) {
        fetch(`/calendar-partial?year=${year}&month=${month}`)
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const newDoc = parser.parseFromString(html, 'text/html');
                const newCalendar = newDoc.querySelector('.calendar-section');
                // 기존 .calendar-section 컨테이너의 내부 내용만 업데이트하여 스타일 유지
                document.querySelector('.calendar-section').innerHTML = newCalendar.innerHTML;

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

                // 새로 추가된 날짜 요소에 이벤트 리스너 등록
                document.querySelectorAll(".days li a").forEach(day => {
                    day.addEventListener("click", handleDateSelection);
                });
            });
    }

    // "YYYY-MM-DD" 형태의 문자열을 { year, month, day } 객체로 변환하는 함수
    function parseDate(dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        return { year, month, day };
    }

    // 초기 날짜 요소에 클릭 이벤트 등록
    days.forEach(day => {
        day.addEventListener("click", handleDateSelection);
    });
});

// DOM 콘텐츠 로딩이 완료되었을 때 실행되는 이벤트 리스너 추가
document.addEventListener("DOMContentLoaded", function () {
    const moodFilterButtons = document.querySelectorAll(".mood-filter-btn");
    const uiSection = document.querySelector("#filtered-diaries");

    const moodMapping = {  // 각 감정(mood)에 대응하는 이모지와 텍스트를 정의한 객체
        "happy": { emoji: "😊", text: "행복한 일기" },
        "neutral": { emoji: "😐", text: "보통의 일기" },
        "sad": { emoji: "😢", text: "슬픈 일기" }
    };

    // 문자열 길이가 maxLength보다 길 경우 잘라서 '...'을 추가하여 반환하는 함수
    function truncateText(text, maxLength) { 
        return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    }

    // 선택한 감정(mood)과 정렬 순서(sortOrder)에 따라 서버에서 일기 데이터를 가져오는 함수
    function fetchFilteredDiaries(mood, sortOrder = "desc") {
        fetch(`/filter-diary?mood=${mood}&order=${sortOrder}`)
            .then(response => response.json())
            .then(data => {  // 선택된 감정에 맞는 이모지와 텍스트를 가져옴 (없으면 기본값 설정)
                const moodInfo = moodMapping[mood] || { emoji: "", text: "일기" };
    
                if (data.length === 0) {
                    uiSection.innerHTML = `<p class="has-text-danger">${moodInfo.emoji} ${moodInfo.text}가 없습니다.</p>`;
                    return;
                }
                
                // 데이터가 있을 경우 정렬 버튼과 함께 일기 목록을 화면에 렌더링
                uiSection.innerHTML = `
                    <hr>
                    <div class="sort-container" style="margin-bottom: 10px;">
                        <button class="button sort-btn ${sortOrder === 'desc' ? 'is-primary' : ''}" data-order="desc">최신순</button>
                        <button class="button sort-btn ${sortOrder === 'asc' ? 'is-primary' : ''}" data-order="asc">오래된 순</button>
                    </div>
                    <div class="diary-list-container">
                        ${data.map(entry => `
                            <div class="box diary-entry" data-date="${entry.date}">
                                <h3 class="title is-4">${entry.title || "제목 없음"}</h3>
                                <p><strong>내용:</strong>${truncateText(entry.content || "내용 없음", 100)} </p>
                                <hr>
                                <p><strong></strong> ${entry.date}</p>
                            </div>
                        `).join('')}
                    </div>
                `;
    
                // 정렬 버튼 이벤트 추가
                document.querySelectorAll(".sort-btn").forEach(button => {
                    button.addEventListener("click", function () {
                        const newSortOrder = this.dataset.order;
                        fetchFilteredDiaries(mood, newSortOrder);
                    });
                });
    
                // 🟢 일기 카드 클릭 시 `handleDateSelection` 실행
                document.querySelectorAll(".diary-entry").forEach(entry => {
                    entry.addEventListener("click", function () {
                        const selectedDate = this.dataset.date;
                        console.log("🔍 선택된 날짜:", selectedDate);
    
                        if (!selectedDate) {
                            console.error("❌ 날짜 데이터가 없습니다!");
                            return;
                        }
    
                        handleDateSelection(null, selectedDate); // ✅ 기존 캘린더 방식으로 보기 화면 이동!
                    });
                });
            })
            .catch(error => {
                console.error("Error fetching filtered diary:", error);
                uiSection.innerHTML = `<p class="has-text-danger">일기 데이터를 불러오는 데 실패했습니다.</p>`;
            });
    }    

    // 감정 필터 버튼 클릭 시 해당 감정의 일기를 필터링하여 표시하는 기능 추가
    moodFilterButtons.forEach(button => {
        button.addEventListener("click", function () {
            const selectedMood = this.dataset.mood;
            fetchFilteredDiaries(selectedMood);
        });
    });
});

// 날짜 피커 아이콘 클릭 시 날짜 선택 창을 열어주는 기능 추가
document.getElementById('dateIconButton').addEventListener('click', function () {
    document.getElementById('datePicker').click();  // 날짜 피커 열기
});

// 날짜 피커에서 날짜 선택 시 해당 월의 달력 페이지로 이동하는 기능 추가
document.getElementById('datePicker').addEventListener('change', function () {
    var selectedDate = new Date(this.value);
    var year = selectedDate.getFullYear();
    var month = selectedDate.getMonth() + 1; // 월을 1부터 시작
    window.location.href = '/home?year=' + year + '&month=' + month;
});

document.getElementById('dateIconButton').addEventListener('click', function () {
    var datePicker = document.getElementById('datePicker');
    datePicker.style.visibility = 'visible'; // 잠깐 보이게 처리
    datePicker.click();
    datePicker.style.visibility = 'hidden'; // 다시 숨김
});

// 캘린더의 날짜 클릭 시 선택된 날짜 강조 표시 기능 추가
document.querySelectorAll('.days li').forEach(function (li) {
    li.addEventListener('click', function (e) {
        // 기본 동작 방지 (링크 클릭 시 페이지 이동 방지)
        e.preventDefault(); // 기본 링크 이동 방지

        // 이미 선택된 날짜를 클릭하면 선택 해제
        if (li.classList.contains('selected')) {
            li.classList.remove('selected'); 
        } else {
            // 모든 날짜에서 'selected' 클래스 제거
            document.querySelectorAll('.days li').forEach(function (el) {
                el.classList.remove('selected');
            });
            // 선택된 날짜에 'selected' 클래스 추가
            li.classList.add('selected');
        }
    });
});
