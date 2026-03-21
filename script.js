const STORAGE_KEY = 'anniversary-counter-data';

const todayBadge = document.getElementById('today-badge');
const relationshipForm = document.getElementById('relationship-form');
const relationshipDateInput = document.getElementById('relationship-date');
const relationshipError = document.getElementById('relationship-error');
const relationshipSuccess = document.getElementById('relationship-success');
const summarySection = document.getElementById('summary-section');
const daysTogetherElement = document.getElementById('days-together');
const monthlyCountdownElement = document.getElementById('monthly-countdown');
const monthlyMessageElement = document.getElementById('monthly-message');
const yearlyCountdownElement = document.getElementById('yearly-countdown');
const yearlyMessageElement = document.getElementById('yearly-message');

const customAnniversaryForm = document.getElementById('custom-anniversary-form');
const anniversaryNameInput = document.getElementById('anniversary-name');
const anniversaryDateInput = document.getElementById('anniversary-date');
const customError = document.getElementById('custom-error');
const anniversaryList = document.getElementById('anniversary-list');
const emptyState = document.getElementById('empty-state');

let appData = loadAppData();

initialize();

function initialize() {
  renderTodayBadge();
  relationshipDateInput.value = appData.relationshipDate || '';
  renderSummary();
  renderAnniversaryList();

  relationshipForm.addEventListener('submit', handleRelationshipSubmit);
  customAnniversaryForm.addEventListener('submit', handleCustomAnniversarySubmit);
  anniversaryList.addEventListener('click', handleAnniversaryDelete);
}

// localStorage から保存済みデータを読み込みます。
function loadAppData() {
  const rawData = localStorage.getItem(STORAGE_KEY);

  if (!rawData) {
    return createEmptyData();
  }

  try {
    const parsedData = JSON.parse(rawData);

    return {
      relationshipDate: typeof parsedData.relationshipDate === 'string' ? parsedData.relationshipDate : '',
      anniversaries: Array.isArray(parsedData.anniversaries)
        ? parsedData.anniversaries.filter((item) => item && item.id && item.name && item.date)
        : []
    };
  } catch (error) {
    return createEmptyData();
  }
}

function createEmptyData() {
  return {
    relationshipDate: '',
    anniversaries: []
  };
}

// 入力内容をブラウザに保存します。
function saveAppData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function handleRelationshipSubmit(event) {
  event.preventDefault();
  relationshipError.textContent = '';
  relationshipSuccess.textContent = '';

  const selectedDate = relationshipDateInput.value;

  if (!selectedDate) {
    relationshipError.textContent = '付き合った日を入力してください。';
    renderSummary();
    return;
  }

  const relationshipDate = parseLocalDate(selectedDate);
  const today = getToday();

  if (!relationshipDate) {
    relationshipError.textContent = '日付の形式を確認してください。';
    return;
  }

  if (relationshipDate > today) {
    relationshipError.textContent = '付き合った日に未来の日付は設定できません。';
    return;
  }

  appData.relationshipDate = selectedDate;
  saveAppData();
  renderSummary();
  relationshipSuccess.textContent = '付き合った日を保存しました。';
}

function handleCustomAnniversarySubmit(event) {
  event.preventDefault();
  customError.textContent = '';

  const anniversaryName = anniversaryNameInput.value.trim();
  const anniversaryDate = anniversaryDateInput.value;

  if (!anniversaryName || !anniversaryDate) {
    customError.textContent = '記念日の名前と日付をどちらも入力してください。';
    return;
  }

  if (!parseLocalDate(anniversaryDate)) {
    customError.textContent = '記念日の日付を正しく入力してください。';
    return;
  }

  appData.anniversaries.push({
    id: createId(),
    name: anniversaryName,
    date: anniversaryDate
  });

  saveAppData();
  renderAnniversaryList();
  customAnniversaryForm.reset();
}

function handleAnniversaryDelete(event) {
  const deleteButton = event.target.closest('[data-delete-id]');

  if (!deleteButton) {
    return;
  }

  const deleteId = deleteButton.dataset.deleteId;
  appData.anniversaries = appData.anniversaries.filter((item) => item.id !== deleteId);
  saveAppData();
  renderAnniversaryList();
}

function renderTodayBadge() {
  const today = getToday();
  todayBadge.textContent = `${today.getMonth() + 1}/${today.getDate()}`;
}

function renderSummary() {
  if (!appData.relationshipDate) {
    summarySection.classList.add('hidden');
    return;
  }

  const relationshipDate = parseLocalDate(appData.relationshipDate);
  const today = getToday();

  if (!relationshipDate || relationshipDate > today) {
    summarySection.classList.add('hidden');
    return;
  }

  const daysTogether = getDaysBetween(relationshipDate, today) + 1;
  const nextMonthlyAnniversary = getNextMonthlyAnniversary(relationshipDate, today);
  const monthlyRemainingDays = getDaysBetween(today, nextMonthlyAnniversary);
  const nextYearlyAnniversary = getNextYearlyAnniversary(relationshipDate, today);
  const yearlyRemainingDays = getDaysBetween(today, nextYearlyAnniversary);

  daysTogetherElement.textContent = `${daysTogether}日`;
  monthlyCountdownElement.textContent = formatCountdown(monthlyRemainingDays);
  yearlyCountdownElement.textContent = formatCountdown(yearlyRemainingDays);
  monthlyMessageElement.textContent = formatAnniversaryMessage(monthlyRemainingDays, '月記念日');
  yearlyMessageElement.textContent = formatAnniversaryMessage(yearlyRemainingDays, '年記念日');
  summarySection.classList.remove('hidden');
}

function renderAnniversaryList() {
  anniversaryList.innerHTML = '';

  if (appData.anniversaries.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  const sortedAnniversaries = [...appData.anniversaries].sort((firstItem, secondItem) => {
    return firstItem.date.localeCompare(secondItem.date);
  });

  sortedAnniversaries.forEach((item) => {
    const listItem = document.createElement('li');
    listItem.className = 'anniversary-item';

    const textArea = document.createElement('div');
    const title = document.createElement('p');
    const meta = document.createElement('p');

    title.className = 'anniversary-item__title';
    title.textContent = item.name;

    meta.className = 'anniversary-item__meta';
    meta.textContent = `${formatDateForDisplay(item.date)} に登録`;

    textArea.append(title, meta);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete-button';
    deleteButton.dataset.deleteId = item.id;
    deleteButton.textContent = '削除する';

    listItem.append(textArea, deleteButton);
    anniversaryList.appendChild(listItem);
  });
}

// 月末日にも対応しながら次の月記念日を計算します。
function getNextMonthlyAnniversary(baseDate, today) {
  const thisMonthAnniversary = createAdjustedDate(today.getFullYear(), today.getMonth(), baseDate.getDate());

  if (thisMonthAnniversary >= today) {
    return thisMonthAnniversary;
  }

  return createAdjustedDate(today.getFullYear(), today.getMonth() + 1, baseDate.getDate());
}

// うるう年も考慮しながら次の年記念日を計算します。
function getNextYearlyAnniversary(baseDate, today) {
  const thisYearAnniversary = createAdjustedDate(today.getFullYear(), baseDate.getMonth(), baseDate.getDate());

  if (thisYearAnniversary >= today) {
    return thisYearAnniversary;
  }

  return createAdjustedDate(today.getFullYear() + 1, baseDate.getMonth(), baseDate.getDate());
}

function createAdjustedDate(year, monthIndex, day) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const safeDay = Math.min(day, lastDay);
  return new Date(year, monthIndex, safeDay);
}

function parseLocalDate(dateText) {
  if (!dateText) {
    return null;
  }

  const [year, month, day] = dateText.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  return parsedDate;
}

function getToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getDaysBetween(startDate, endDate) {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.round((endDate - startDate) / millisecondsPerDay);
}

function formatCountdown(remainingDays) {
  return remainingDays === 0 ? '今日です' : `あと${remainingDays}日`;
}

function formatAnniversaryMessage(remainingDays, anniversaryType) {
  return remainingDays === 0
    ? `今日は${anniversaryType}です。おめでとうございます。`
    : `${anniversaryType}まで穏やかにカウントします。`;
}

function formatDateForDisplay(dateText) {
  const date = parseLocalDate(dateText);

  if (!date) {
    return dateText;
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
