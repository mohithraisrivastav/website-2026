(function () {
  const APP_ID = '35945df2-6b0f-4208-8d12-0a731770282f';
  const HOST   = 'https://cusdis.com';

  function esc(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  function fmt(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  async function loadComments(pageId, el) {
    try {
      const res  = await fetch(`${HOST}/api/open/comments?appId=${APP_ID}&pageId=${encodeURIComponent(pageId)}`);
      const json = await res.json();
      const list = (json.data && json.data.data) ? json.data.data : [];
      if (!list.length) {
        el.innerHTML = '<p class="comments-empty">No responses yet.</p>';
        return;
      }
      el.innerHTML = list.map(c => `
        <div class="comment-item">
          <div class="comment-meta">
            <span class="comment-author">${esc(c.nickname)}</span>
            <span class="comment-date">${fmt(c.createdAt)}</span>
          </div>
          <p class="comment-content">${esc(c.content)}</p>
        </div>
      `).join('');
    } catch (_) {
      el.innerHTML = '';
    }
  }

  async function submit(form, pageId, pageTitle, pageUrl) {
    const name    = form.querySelector('.cn-name').value.trim();
    const email   = form.querySelector('.cn-email').value.trim();
    const content = form.querySelector('.cn-body').value.trim();
    if (!name || !content) return;

    const btn = form.querySelector('.cn-submit');
    btn.disabled    = true;
    btn.textContent = 'Sending…';

    try {
      const res = await fetch(`${HOST}/api/open/comments`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ appId: APP_ID, pageId, content, nickname: name, email, pageTitle, pageUrl })
      });
      if (!res.ok) throw new Error();
      form.innerHTML = '<p class="cn-thanks">Thank you. Your response will appear after review.</p>';
    } catch (_) {
      btn.disabled    = false;
      btn.textContent = 'Send';
      form.querySelector('.cn-error').style.display = 'block';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    const thread = document.getElementById('cusdis_thread');
    if (!thread) return;

    const pageId    = thread.dataset.pageId;
    const pageTitle = thread.dataset.pageTitle;
    const pageUrl   = thread.dataset.pageUrl;

    thread.innerHTML = `
      <div class="cn-list" id="cn-list"></div>
      <form class="cn-form" id="cn-form" novalidate>
        <div class="cn-row">
          <div class="cn-field">
            <label for="cn-name">Name</label>
            <input class="cn-name" id="cn-name" type="text" placeholder="Your name" required>
          </div>
          <div class="cn-field">
            <label for="cn-email">Email <span class="cn-optional">(optional, not published)</span></label>
            <input class="cn-email" id="cn-email" type="email" placeholder="your@email.com">
          </div>
        </div>
        <div class="cn-field cn-field--full">
          <label for="cn-body">Response</label>
          <textarea class="cn-body" id="cn-body" rows="5" placeholder="Write something…" required></textarea>
        </div>
        <div class="cn-actions">
          <button class="cn-submit" type="submit">Send</button>
          <span class="cn-moderation">Comments are moderated before they appear.</span>
        </div>
        <p class="cn-error" style="display:none">Something went wrong. Please try again.</p>
      </form>
    `;

    loadComments(pageId, thread.querySelector('#cn-list'));
    thread.querySelector('#cn-form').addEventListener('submit', function (e) {
      e.preventDefault();
      submit(this, pageId, pageTitle, pageUrl);
    });
  });
})();
