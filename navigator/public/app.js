const form = document.querySelector('#query-form');
const input = document.querySelector('#query');
const result = document.querySelector('#result');
const welcome = document.querySelector('#welcome');
const answerCopy = document.querySelector('#answer-copy');
const answerSource = document.querySelector('#answer-source');
const providerNote = document.querySelector('#provider-note');
const destinations = document.querySelector('#destinations');
const status = document.querySelector('#status');
const submit = form.querySelector('button[type="submit"]');

function destinationCard(hit, index) {
  const article = document.createElement('article');
  article.className = 'match';
  const rank = document.createElement('span');
  rank.className = 'rank';
  rank.textContent = String(index + 1);
  const copy = document.createElement('div');
  copy.className = 'match-copy';
  const heading = document.createElement('div');
  heading.className = 'match-heading';
  const title = document.createElement('h3');
  title.textContent = hit.label;
  const path = document.createElement('code');
  path.textContent = hit.path;
  heading.append(title, path);
  const description = document.createElement('p');
  description.textContent = hit.description;
  const meta = document.createElement('small');
  meta.textContent = `${hit.navigationGroup} · ${hit.component} · Owner: ${hit.workflowOwner}`;
  copy.append(heading, description, meta);
  const action = document.createElement('span');
  action.className = 'route-state';
  action.textContent = hit.navigable ? 'Verified route' : 'Needs record ID';
  article.append(rank, copy, action);
  return article;
}

async function queryNavigator(question) {
  input.value = question;
  submit.disabled = true;
  submit.textContent = 'Retrieving…';
  try {
    const response = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: question }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
    answerCopy.textContent = body.answer;
    answerSource.textContent = body.source === 'groq' ? 'Groq + verified catalog' : 'Verified catalog';
    providerNote.classList.toggle('hidden', !body.providerError);
    providerNote.textContent = body.providerError ? `${body.providerError}. Showing the catalog result.` : '';
    destinations.replaceChildren(...body.destinations.map(destinationCard));
    if (!body.destinations.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No verified destination matched. No route was generated.';
      destinations.append(empty);
    }
    welcome.classList.add('hidden');
    result.classList.remove('hidden');
  } catch (error) {
    answerCopy.textContent = error instanceof Error ? error.message : 'Unable to query navigator.';
    answerSource.textContent = 'Error';
    destinations.replaceChildren();
    welcome.classList.add('hidden');
    result.classList.remove('hidden');
  } finally {
    submit.disabled = false;
    submit.textContent = 'Ask';
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  void queryNavigator(input.value.trim());
});
document.querySelectorAll('.starters button').forEach((button) => {
  button.addEventListener('click', () => void queryNavigator(button.textContent));
});

fetch('/api/health').then((response) => response.json()).then((health) => {
  status.textContent = `${health.documents} verified locations · ${health.groqConfigured ? 'Groq ready' : 'catalog-only mode'} · source ${String(health.catalogCommit).slice(0, 8)}`;
}).catch(() => { status.textContent = 'Catalog status unavailable'; });
