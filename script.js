const STORAGE_KEY = 'anniversary-counter-data';

const todayBadge = document.getElementById('today-badge');
const relationshipForm = document.getElementById('relationship-form');
const relationshipDateInput = document.getElementById('relationship-date');
const relationshipError = document.getElementById('relationship-error');
const relationshipSuccess = document.getElementById('relationship-success');
const summarySection = document.getElementById('summary-section');
const celebrationBanner = document.getElementById('celebration-banner');
const celebrationMessage = document.getElementById('celebration-message');
const daysTogetherElement = document.getElementById('days-together');
const monthlyCountdownElement = document.getElementById('monthly-countdown');
const monthlyMessageElement = document.getElementById('monthly-message');
const yearlyCountdownElement = document.getElementById('yearly-countdown');
const yearlyMessageElement = document.getElementById('yearly-message');

const customAnniversaryForm = document.getElementById('custom-anniversary-form');
const anniversaryNameInput = document.getElementById('anniversary-name');
const anniversaryDateInput = document.getElementById('anniversary-date');
const anniversaryMemoInput = document.getElementById('anniversary-memo');
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
        ? parsedData.anniversaries
            .map(normalizeAnniversary)
            .filter((item) => item && item.id && item.name && item.date)
        : []
    };
  } catch (error) {
    return createEmptyData();
  }
}

function normalizeAnniversary(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  return {
    id: typeof item.id === 'string' ? item.id : String(item.id || ''),
    name: typeof item.name === 'string' ? item.name : '',
    date: typeof item.date === 'string' ? item.date : '',
    memo: typeof item.memo === 'string' ? item.memo : ''
  };
}

function createEmptyData() {
  return {
    relationshipDate: '',
    anniversaries: []
  };
}

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
  const anniversaryMemo = anniversaryMemoInput.value.trim();

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
    date: anniversaryDate,
    memo: anniversaryMemo
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

  if (!window.confirm('この記念日を削除しますか？')) {
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
    celebrationBanner.classList.add('hidden');
    return;
  }

  const relationshipDate = parseLocalDate(appData.relationshipDate);
  const today = getToday();

  if (!relationshipDate || relationshipDate > today) {
    summarySection.classList.add('hidden');
    celebrationBanner.classList.add('hidden');
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
  renderCelebrationBanner(monthlyRemainingDays, yearlyRemainingDays);
  summarySection.classList.remove('hidden');
}

function renderCelebrationBanner(monthlyRemainingDays, yearlyRemainingDays) {
  const celebrationTargets = [];

  if (monthlyRemainingDays === 0) {
    celebrationTargets.push('月記念日');
  }

  if (yearlyRemainingDays === 0) {
    celebrationTargets.push('年記念日');
  }

  if (celebrationTargets.length === 0) {
    celebrationBanner.classList.add('hidden');
    return;
  }

  if (celebrationTargets.length === 2) {
    celebrationMessage.textContent = '今日は月記念日と年記念日の両方です。おめでとうございます。';
  } else {
    celebrationMessage.textContent = `今日は大切な${celebrationTargets[0]}です。おめでとうございます。`;
  }

  celebrationBanner.classList.remove('hidden');
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
    const safeMemo = typeof item.memo === 'string' ? item.memo : '';
    const listItem = document.createElement('li');
    listItem.className = 'anniversary-item';

    const contentArea = document.createElement('div');
    contentArea.className = 'anniversary-item__content';

    const header = document.createElement('div');
    header.className = 'anniversary-item__header';

    const title = document.createElement('p');
    title.className = 'anniversary-item__title';
    title.textContent = item.name;

    const dateWrap = document.createElement('div');
    dateWrap.className = 'anniversary-item__date-wrap';

    const dateLabel = document.createElement('span');
    dateLabel.className = 'anniversary-item__date-label';
    dateLabel.textContent = 'DATE';

    const date = document.createElement('span');
    date.className = 'anniversary-item__date';
    date.textContent = formatDateForDisplay(item.date);

    dateWrap.append(dateLabel, date);
    header.append(title, dateWrap);

    const details = document.createElement('div');
    details.className = 'anniversary-item__details';

    const meta = document.createElement('p');
    meta.className = 'anniversary-item__meta';
    meta.textContent = '大切な思い出としてブラウザに保存されています。';
    details.append(meta);

    if (safeMemo) {
      const memo = document.createElement('p');
      memo.className = 'anniversary-item__memo';

      const memoLabel = document.createElement('span');
      memoLabel.className = 'anniversary-item__memo-label';
      memoLabel.textContent = 'メモ';

      memo.append(memoLabel, document.createTextNode(`：${safeMemo}`));
      details.append(memo);
    }

    contentArea.append(header, details);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete-button';
    deleteButton.dataset.deleteId = item.id;
    deleteButton.textContent = '削除する';

    listItem.append(contentArea, deleteButton);
    anniversaryList.appendChild(listItem);
  });
}

function getNextMonthlyAnniversary(baseDate, today) {
  const thisMonthAnniversary = createAdjustedDate(today.getFullYear(), today.getMonth(), baseDate.getDate());

  if (thisMonthAnniversary >= today) {
    return thisMonthAnniversary;
  }

  return createAdjustedDate(today.getFullYear(), today.getMonth() + 1, baseDate.getDate());
}

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
