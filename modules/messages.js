// messages.js
// Module for displaying Discord messages from the "Messages" folder.

/* global JSZip */

async function readJson(zip, path) {
    const file = zip.file(path);
    if (!file) throw new Error(`File not found: ${path}`);
    const text = await file.async('string');
    return JSON.parse(text);
}

function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) return [];
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((h, i) => obj[h] = values[i]);
        return obj;
    });
}

async function readMessages(zip, dir) {
    const jsonPath = `Messages/${dir}/messages.json`;
    const csvPath = `Messages/${dir}/messages.csv`;
    if (zip.file(jsonPath)) {
        const data = await readJson(zip, jsonPath);
        return data.map(m => ({
            id: m.ID ?? m.id ?? '',
            timestamp: m.Timestamp ?? m.timestamp ?? '',
            content: m.Contents ?? m.content ?? '',
            attachments: m.Attachments ?? m.attachments ?? ''
        }));
    } else if (zip.file(csvPath)) {
        const text = await zip.file(csvPath).async('string');
        const parsed = parseCsv(text);
        return parsed.map(m => ({
            id: m.ID,
            timestamp: m.Timestamp,
            content: m.Contents,
            attachments: m.Attachments
        }));
    }
    return [];
}

async function readChannelInfo(zip, dir) {
    const path = `Messages/${dir}/channel.json`;
    try {
        const ch = await readJson(zip, path);
        const isDM = !ch.guild_id && (ch.type === 1 || ch.type === 3 || ch.recipients?.length);
        const info = {
            id: ch.id,
            name: ch.name || ch.recipients?.[0]?.username || ch.recipient?.username || `DM ${dir}`,
            type: ch.type,
            is_dm: !!isDM,
            guild: ch.guild?.name ?? null
        };
        return info;
    } catch (_) {
        const fallback = {
            id: dir,
            name: `DM ${dir}`,
            type: '',
            is_dm: true,
            guild: null
        };
        return fallback;
    }
}

function listChannelDirs(zip) {
    const dirs = new Set();
    zip.forEach((relativePath, file) => {
        const match = relativePath.match(/^Messages\/([^/]+)\/(?:messages\.json|messages\.csv|channel\.json)$/);
        if (match) {
            dirs.add(match[1]);
        }
    });
    return Array.from(dirs);
}

export async function render(zip, container) {
    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexWrap = 'wrap';

    const channelList = document.createElement('div');
    channelList.style.width = '30%';
    channelList.style.minWidth = '200px';
    channelList.style.maxHeight = '100vh';
    channelList.style.overflowY = 'auto';
    channelList.style.marginRight = '1rem';
    channelList.className = 'card';

    const listHeading = document.createElement('h3');
    listHeading.textContent = 'Channels';
    channelList.appendChild(listHeading);

    const dmDetails = document.createElement('details');
    const dmSummary = document.createElement('summary');
    dmSummary.textContent = '📥 Direct Messages';
    dmDetails.appendChild(dmSummary);
    const dmList = document.createElement('ul');
    dmList.style.listStyle = 'none';
    dmList.style.padding = 0;
    dmList.style.margin = 0;
    dmDetails.appendChild(dmList);
    dmDetails.open = false;
    channelList.appendChild(dmDetails);

    const guildMap = new Map();

    const messageView = document.createElement('div');
    messageView.style.flex = '1';
    messageView.className = 'card';
    messageView.style.minWidth = '300px';

    const msgHeading = document.createElement('h3');
    msgHeading.textContent = 'Messages';
    messageView.appendChild(msgHeading);

    const msgContainer = document.createElement('div');
    msgContainer.style.overflowX = 'auto';
    msgContainer.style.wordBreak = 'break-word';
    msgContainer.style.maxWidth = '100%';
    messageView.appendChild(msgContainer);

    wrapper.appendChild(channelList);
    wrapper.appendChild(messageView);
    container.appendChild(wrapper);

    const dirs = listChannelDirs(zip).sort();
    for (const dir of dirs) {
        const info = await readChannelInfo(zip, dir);
        const li = document.createElement('li');
        li.style.padding = '0.5rem';
        li.style.cursor = 'pointer';
        li.style.borderBottom = '1px solid #eee';

        let channelName = info.name?.trim() || `DM ${info.id}`;
        li.textContent = channelName;

        li.addEventListener('click', async () => {
            document.querySelectorAll('li').forEach(item => {
                item.style.backgroundColor = '';
            });
            li.style.backgroundColor = '#f1f4f8';

            msgContainer.innerHTML = 'Loading messages…';
            const messages = await readMessages(zip, dir);
            msgHeading.textContent = `Messages in ${info.name}${info.guild && !info.is_dm ? ', ' + info.guild : ''}`;

            if (!messages.length) {
                msgContainer.textContent = 'No messages in this channel.';
                return;
            }

            const table = document.createElement('table');
            table.style.wordBreak = 'break-word';
            table.style.tableLayout = 'fixed';
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';

            const thead = document.createElement('thead');
            const headRow = document.createElement('tr');
            ['Timestamp', 'Content', 'Attachments'].forEach(text => {
                const th = document.createElement('th');
                th.textContent = text;
                th.style.textAlign = 'left';
                th.style.padding = '0.5rem';
                th.style.borderBottom = '1px solid #ccc';
                th.style.maxWidth = '300px';
                th.style.overflowWrap = 'break-word';
                headRow.appendChild(th);
            });
            thead.appendChild(headRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            messages.forEach(m => {
                const tr = document.createElement('tr');

                const ts = document.createElement('td');
                ts.textContent = m.timestamp;

                const contentCell = document.createElement('td');
                contentCell.textContent = m.content;

                const att = document.createElement('td');
                att.style.maxWidth = '300px';
                att.style.wordBreak = 'break-all';
                att.style.overflowWrap = 'break-word';

                if (m.attachments && m.attachments.startsWith('http')) {
                    const link = document.createElement('a');
                    link.href = m.attachments;
                    link.textContent = '📎 Open attachment';
                    link.target = '_blank';
                    att.appendChild(link);
                } else {
                    att.textContent = m.attachments;
                }

                [ts, contentCell, att].forEach(td => {
                    td.style.padding = '0.5rem';
                    td.style.verticalAlign = 'top';
                    td.style.borderBottom = '1px solid #eee';
                });

                tr.appendChild(ts);
                tr.appendChild(contentCell);
                tr.appendChild(att);
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            msgContainer.innerHTML = '';
            msgContainer.appendChild(table);
        });

        if (info.is_dm === true || info.is_dm === 1 || info.is_dm === 2) {
            dmList.appendChild(li);
        } else {
            const guild = info.guild || 'Server';
            if (!guildMap.has(guild)) {
                guildMap.set(guild, []);
            }
            guildMap.get(guild).push(li);
        }
    }

    for (const [guild, items] of guildMap.entries()) {
        const details = document.createElement('details');
        details.open = false;
        const summary = document.createElement('summary');
        summary.textContent = guild;
        details.appendChild(summary);
        const ul = document.createElement('ul');
        ul.style.listStyle = 'none';
        ul.style.padding = 0;
        ul.style.margin = 0;
        items.forEach(item => ul.appendChild(item));
        details.appendChild(ul);
        channelList.appendChild(details);
    }
}

export async function test(zip) {
    const results = [];
    const csvSample = 'ID,Timestamp,Contents,Attachments\n1,2021-01-01,Hello,\n2,2021-01-02,World,link';
    const parsed = parseCsv(csvSample);
    const csvOk = parsed.length === 2 && parsed[0].ID === '1' && parsed[1].Contents === 'World';
    results.push({ name: 'parseCsv simple test', passed: csvOk });

    const dirs = listChannelDirs(zip).sort();

    if (dirs.length) {
        const dir = dirs[0];
        try {
            const msgs = await readMessages(zip, dir);
            results.push({ name: 'readMessages returns array', passed: Array.isArray(msgs) });
        } catch (_) {
            results.push({ name: 'readMessages returns array', passed: false });
        }
    }
    return results;
}
