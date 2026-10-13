'use strict';
(() => {
  function node(tag, attrs = {}, children = []) {
    const item = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'text') item.textContent = String(value);
      else if (key.startsWith('on')) item.addEventListener(key.slice(2), value);
      else item.setAttribute(key, String(value));
    }
    for (const child of Array.isArray(children) ? children : [children]) if (child != null) item.append(typeof child === 'string' ? document.createTextNode(child) : child);
    return item;
  }
  function forumBody(artifact) {
    const thread = node('section', { class: 'source-forum-thread', 'aria-label': artifact.title });
    const paragraphs = (artifact.body || []).map(text => {
      const value = String(text);
      const match = /^((?:\d{1,2}\s+[A-Za-z]+\s+\d{4},?\s+)?\d{1,2}:\d{2}(?::\d{2})?\s+UTC)\s+·\s+([^:]+):\s*([\s\S]*)$/.exec(value);
      return match ? { timestamp: match[1], username: match[2], body: match[3] } : { note: value };
    });
    const replyCount = Math.max(0, paragraphs.filter(item => !Object.hasOwn(item, 'note')).length - 1);
    let postCount = 0;
    for (const item of paragraphs) {
      if (Object.hasOwn(item, 'note')) { thread.append(node('p', { class: 'source-forum-note', text: item.note })); continue; }
      if (postCount === 1) thread.append(node('hr', { class: 'source-forum-divider' }), node('h3', { class: 'source-forum-reply-heading', text: replyCount + (replyCount === 1 ? ' reply' : ' replies') }));
      const post = node('article', { class: 'source-forum-post' + (postCount ? ' source-forum-reply' : ' source-forum-original'), 'aria-label': postCount ? 'Reply by ' + item.username : 'Original post by ' + item.username });
      post.append(node('header', { class: 'source-forum-byline' }, [
        node('span', { class: 'source-forum-account' }, [
          node('span', { class: 'source-forum-avatar', 'aria-hidden': 'true', text: item.username.charAt(0).toUpperCase() }),
          node('span', {}, [node('span', { class: 'source-forum-username-label', text: 'Username' }), node('strong', { text: item.username })])
        ]), node('em', { text: item.timestamp })
      ]), node('p', { text: item.body }));
      thread.append(post); postCount += 1;
    }
    return thread;
  }
  function render(container, context) {
    const { activity, pageId } = context, page = activity.pages.find(p => p.id === pageId);
    const allowed = new Set(context.allowedArtifactIds || activity.caseData.artifacts.map(a => a.id));
    if (!page || page.artifactIds.some(id => !allowed.has(id))) { container.replaceChildren(node('p', { class: 'source-notice', text: 'This source is not available in the current section.' })); return; }
    const byId = new Map(activity.caseData.artifacts.map(a => [a.id, a]));
    const image = value => {
      const item = typeof value === 'string' ? { src: value } : value;
      const filename = item?.src?.split('/').pop();
      if (!/^[a-z0-9-]+\.png$/i.test(filename || '')) return null;
      return node('figure', {}, [node('a', { href: (context.assetBase || 'images/') + filename, target: '_blank', rel: 'noopener' }, node('img', { src: (context.assetBase || 'images/') + filename, alt: item.alt || 'Photograph from this fictional source', loading: 'lazy', 'data-noinspector': 'true' })), item.caption ? node('figcaption', { text: item.caption }) : null]);
    };
    function sourceFooter(a) {
      const footer = node('footer', { class: 'source-footer' }, [node('span', { text: 'Source ' + a.id })]);
      if (context.onCite) footer.append(node('button', { type: 'button', text: 'Use this source', onclick: () => context.onCite(a.id) }));
      return footer;
    }
    const pageArtifacts = page.artifactIds.map(id => byId.get(id)).filter(Boolean);
    if (pageArtifacts.length && pageArtifacts.every(artifact => artifact.type === 'forum')) {
      const publicForumIds = new Set(activity.pages.filter(item => item.public).flatMap(item => item.artifactIds));
      const discussions = [...byId.values()].filter(artifact => artifact.type === 'forum' && allowed.has(artifact.id) && publicForumIds.has(artifact.id));
      const shell = node('div', { class: 'source-site source-forum-site' });
      shell.append(node('header', { class: 'source-forum-masthead' }, [
        node('div', { class: 'source-forum-brand' }, [node('span', { class: 'source-forum-logo', 'aria-hidden': 'true', text: 't' }), node('span', { text: 'threadline' })]),
        node('span', { class: 'source-forum-tagline', text: 'A place for good conversations.' })
      ]));
      shell.append(node('section', { class: 'source-forum-community', 'aria-label': 'Marketing and communications community' }, [
        node('span', { class: 'source-forum-community-icon', 'aria-hidden': 'true', text: 'm/' }),
        node('div', {}, [node('p', { class: 'source-forum-community-handle', text: 'c/marketing' }), node('h1', { text: 'Marketing & communications' }), node('p', { text: 'Better posts. Useful feedback. Real conversations.' })])
      ]));
      const nav = node('nav', { class: 'source-forum-nav', 'aria-label': 'Community navigation' });
      const about = node('section', { class: 'source-forum-about', tabindex: '-1' }, [
        node('h2', { text: 'About this community' }),
        node('p', { text: 'A place to talk about writing, audience feedback, and the everyday work behind public posts.' }),
        node('p', { class: 'source-forum-account-note', text: 'People post using usernames. A username can be a nickname, a pen name, or a handle.' }),
        node('h3', { text: 'Keep the conversation useful' }),
        node('ul', {}, [node('li', { text: 'Share ideas and constructive feedback.' }), node('li', { text: 'Be respectful of other members.' }), node('li', { text: 'Stay on topic.' })])
      ]);
      const threadNodes = new Map();
      const threadList = node('div', { class: 'source-forum-discussions', tabindex: '-1' });
      const scrollTo = element => { element.scrollIntoView({ behavior: 'smooth', block: 'start' }); element.focus({ preventScroll: true }); };
      nav.append(node('button', { type: 'button', class: 'source-forum-nav-current', text: 'Discussions', onclick: () => scrollTo(threadList) }), node('button', { type: 'button', text: 'About this community', onclick: () => scrollTo(about) }));
      shell.append(nav);
      for (const artifact of pageArtifacts) {
        const discussion = node('article', { class: 'source-forum-discussion', tabindex: '-1' }, [
          node('div', { class: 'source-forum-topic-meta' }, [node('span', { text: 'c/marketing' }), node('span', { class: 'source-forum-topic-flair', text: 'Discussion' }), artifact.date ? node('span', { text: artifact.date }) : null]),
          node('h2', { class: 'source-forum-topic-title', text: artifact.title }),
          forumBody(artifact), sourceFooter(artifact)
        ]);
        threadNodes.set(artifact.id, discussion); threadList.append(discussion);
      }
      const sidebar = node('aside', { class: 'source-forum-sidebar', 'aria-label': 'Community information' }, about);
      const links = node('nav', { class: 'source-forum-other-threads', 'aria-label': 'Community discussions' }, node('h2', { text: 'In this community' }));
      let linkCount = 0;
      for (const artifact of discussions) {
        const localThread = threadNodes.get(artifact.id);
        const target = activity.pages.find(item => item.id !== page.id && item.public && item.artifactIds.includes(artifact.id) && item.artifactIds.every(id => allowed.has(id)));
        const open = localThread ? () => scrollTo(localThread) : context.onOpenArtifact ? () => context.onOpenArtifact(artifact.id) : target && context.onNavigate ? () => context.onNavigate(target.id) : null;
        if (!open) continue;
        links.append(node('button', { type: 'button', text: artifact.title, onclick: open })); linkCount += 1;
      }
      if (linkCount) sidebar.append(links);
      shell.append(node('div', { class: 'source-forum-layout' }, [threadList, sidebar]), node('p', { class: 'source-training', text: 'Fictional community for the MrQ cybersecurity lab.' }));
      container.replaceChildren(shell); return;
    }
    const shell = node('div', { class: 'source-site ' + (page.id === 'mandy-feed' ? 'source-social' : '') });
    shell.append(node('header', { class: 'source-masthead' }, [node('strong', { text: page.site || 'Case sources' }), node('span', { text: page.public ? 'Public page' : 'Provided case records' })]));
    if (page.id === 'mandy-feed') {
      const profile = byId.get('PROFILE-01'), current = byId.get('FRAME-04'), older = byId.get('FRAME-01');
      const avatar = node('img', { class: 'source-avatar', src: (context.assetBase || 'images/') + 'mandy-schmear-reference.png', alt: 'Mandy Schmear', 'data-noinspector': 'true' });
      shell.append(node('section', { class: 'source-profile' }, [avatar, node('div', {}, [node('h1', { text: 'Mandy Schmear' }), node('p', { text: 'Governor · Community, family and public service' }), node('p', { text: profile.body[1] })])]));
      shell.append(node('h2', { class: 'source-feed-heading', text: 'Posts' }));
      const post = node('article', { class: 'source-post' }, [node('div', { class: 'source-post-byline', text: 'Mandy Schmear · 25 October 2026, 08:10 UTC' }), node('p', { text: current.body[0] })]);
      const comments = node('details', { class: 'source-comments' }, [node('summary', { text: 'Comments (4)' }), ...current.body.slice(2, 6).map(text => node('p', { text }))]);
      post.append(comments, node('details', { class: 'source-details' }, [node('summary', { text: 'Post details' }), node('p', { text: current.body[1] }), node('p', { text: current.body[6] })]), sourceFooter(current));
      shell.append(post);
      for (const text of older.body.slice().reverse()) {
        const parts = text.split(' — '), meta = parts.shift();
        shell.append(node('article', { class: 'source-post' }, [node('div', { class: 'source-post-byline', text: 'Mandy Schmear · ' + meta }), node('p', { text: parts.join(' — ') || text }), sourceFooter(older)]));
      }
    } else {
      shell.append(node('h1', { text: page.title }));
      for (const id of page.artifactIds) {
        const a = byId.get(id); if (!a) continue;
        const article = node('article', { class: 'source-document' }, [node('h2', { text: a.title }), node('p', { class: 'source-byline', text: [a.author, a.date].filter(Boolean).join(' · ') })]);
        const pictures = [...(a.image ? [a.image] : []), ...(a.images || [])];
        if (pictures.length) {
          const team = ['HIGHFIVE-01', 'TEAM-02'].includes(a.id);
          article.append(node('div', { class: team ? 'source-gallery source-team-grid' : pictures.length > 1 ? 'source-gallery' : 'source-picture', ...(team ? { 'aria-label': 'High Five team portraits' } : {}) }, pictures.map(image).filter(Boolean)));
        }
        if (a.type === 'forum') article.append(forumBody(a));
        else for (const text of a.body || []) article.append(node('p', { text }));
        if (a.rows) {
          const table = node('table', {}, [node('caption', { text: a.title }), node('thead', {}, node('tr', {}, a.columns.map(text => node('th', { scope: 'col', text })))), node('tbody', {}, a.rows.map(row => node('tr', {}, row.map(value => node('td', { text: value })))))]);
          const tabular = node('div', { class: 'source-table', tabindex: '0', 'aria-label': 'Scrollable source records' }, table);
          if (['record_id', 'timestamp', 'sender_address', 'recipient_address', 'subject', 'body'].every(field => a.columns.includes(field))) {
            const messages = a.rows.map(row => Object.fromEntries(a.columns.map((field, index) => [field, row[index]]))).sort((left, right) => String(left.timestamp).localeCompare(String(right.timestamp)));
            article.append(node('p', { class: 'source-byline', text: `${messages.length} preserved messages · oldest first · all timestamps are UTC` }));
            for (const message of messages) article.append(node('section', { class: 'source-email', 'aria-label': String(message.record_id) + ' · ' + message.subject }, [
              node('h3', { text: message.subject }),
              node('p', { class: 'source-email-meta', text: message.timestamp + ' · ' + message.record_id }),
              node('p', { class: 'source-email-meta', text: 'From: ' + message.sender_address + '\nTo: ' + message.recipient_address }),
              node('p', { text: message.body }),
              node('p', { class: 'source-email-meta', text: [message.message_id ? 'Message ID: ' + message.message_id : '', message.thread_id ? 'Thread: ' + message.thread_id : '', message.exchange_id && message.exchange_id !== 'none' ? 'Document share: ' + message.exchange_id + ' (see DocumentExchanges)' : '', message.status ? 'Preservation status: ' + message.status : '', message.source_collection_id ? 'Collection: ' + message.source_collection_id : ''].filter(Boolean).join('\n') })
            ]));
            article.append(node('details', { class: 'source-details' }, [node('summary', { text: 'View the complete tabular export' }), tabular]));
          } else if (['record_id', 'timestamp', 'thread_id', 'channel', 'sender_account_id', 'recipient_account_ids', 'body'].every(field => a.columns.includes(field))) {
            const messages = a.rows.map(row => Object.fromEntries(a.columns.map((field, index) => [field, row[index]]))).sort((left, right) => String(left.timestamp).localeCompare(String(right.timestamp)));
            article.append(node('p', { class: 'source-byline', text: `${messages.length} preserved messages · oldest first · all timestamps are UTC` }));
            for (const message of messages) article.append(node('section', { class: 'source-email source-message', 'aria-label': String(message.record_id) }, [
              node('h3', { text: message.channel + ' · ' + message.thread_id }),
              node('p', { class: 'source-email-meta', text: message.timestamp + ' · ' + message.record_id }),
              node('p', { class: 'source-email-meta', text: 'From: ' + message.sender_account_id + '\nTo: ' + message.recipient_account_ids }),
              node('p', { text: message.body }),
              node('details', { class: 'source-details' }, [node('summary', { text: 'Message record details' }), node('p', { class: 'source-email-meta', text: [message.reference_id && message.reference_id !== 'none' ? 'Reference: ' + message.reference_id : '', message.source_collection_id ? 'Collection: ' + message.source_collection_id : ''].filter(Boolean).join('\n') })])
            ]));
            article.append(node('details', { class: 'source-details' }, [node('summary', { text: 'View the complete tabular export' }), tabular]));
          } else article.append(tabular);
        }
        const related = [];
        for (const item of a.links || []) {
          if (!allowed.has(item.artifactId)) continue;
          const target = activity.pages.find(p => p.id !== page.id && p.artifactIds.includes(item.artifactId) && (!page.public || p.public) && p.artifactIds.every(id => allowed.has(id)));
          if (target && !related.some(x => x.id === target.id)) related.push({ ...target, label: item.label });
        }
        if (related.length && context.onNavigate) article.append(node('nav', { class: 'source-related', 'aria-label': 'Related sources' }, related.map(target => node('button', { type: 'button', text: target.label, onclick: () => context.onNavigate(target.id) }))));
        article.append(sourceFooter(a)); shell.append(article);
      }
    }
    shell.append(node('p', { class: 'source-training', text: 'Fictional material for the MrQ cybersecurity lab.' }));
    container.replaceChildren(shell);
  }
  window.CampaignSources = Object.freeze({ render });
})();
