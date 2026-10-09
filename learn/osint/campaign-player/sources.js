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
        if (pictures.length) article.append(node('div', { class: pictures.length > 1 ? 'source-gallery' : 'source-picture' }, pictures.map(image).filter(Boolean)));
        for (const text of a.body || []) article.append(node('p', { text }));
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
