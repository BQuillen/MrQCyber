#!/usr/bin/env python3
"""Build private instructor payloads outside the public website; never publish them to Git."""
import argparse
import base64
import hashlib
import json
import re
from pathlib import Path


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def csp_hash(text):
    return "'sha256-" + base64.b64encode(hashlib.sha256(text.encode()).digest()).decode() + "'"


def script(text):
    # These case data strings are JSON; escaping a closing tag preserves its value.
    return re.sub(r'</script', r'<\\/script', text, flags=re.IGNORECASE)


def build(site, teacher, output):
    if output == site or site in output.parents:
        raise ValueError('Private output must be outside the public site.')
    output.mkdir(parents=True, exist_ok=True)
    wall = teacher / 'operations-wall'
    source = (wall / 'index.html').read_text()
    css = (wall / 'style.css').read_text()
    scripts = [
        script((site / 'learn/osint/campaign-player/activity-data.js').read_text()),
        script((wall / 'data.js').read_text().replace('../campaign-player/images/', 'https://mrqcyber.com/learn/osint/campaign-player/images/')),
        script((wall / 'app.js').read_text()),
    ]
    source = re.sub(r'<link rel="stylesheet"[^>]+>', lambda _: '<style>' + css + '</style>', source)
    source = re.sub(r'\s*<script defer[^>]+></script>', '', source)
    source = source.replace('</body>', '\n' + '\n'.join('<script>' + text + '</script>' for text in scripts) + '\n</body>')
    source = source.replace('href="../#/investigations"', 'href="https://mrqcyber.com/learn/osint/#/investigations" target="_blank" rel="noopener"')
    hashes = {'scripts': [csp_hash(text) for text in scripts], 'styles': [csp_hash(css)]}
    child_csp = "default-src 'none'; script-src " + ' '.join(hashes['scripts']) + "; style-src " + ' '.join(hashes['styles']) + "; img-src https://mrqcyber.com data:; connect-src 'none'; base-uri 'none'; form-action 'none'"
    source = source.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n  <meta http-equiv="Content-Security-Policy" content="' + child_csp + '">')
    wall_bytes = source.encode()
    (output / 'campaign-operations-wall.html').write_bytes(wall_bytes)
    (output / 'csp-hashes.json').write_text(json.dumps(hashes, indent=2) + '\n')
    resources = [{
        'id': 'campaign-investigation', 'collection': 'The Campaign Post',
        'title': 'Student investigation', 'description': 'Open the guided case for investigators or network specialists.',
        'kind': 'link', 'sort_order': 10,
        'links': [
            {'label': 'Year 1 · Investigators', 'href': '/learn/osint/campaign-player/index.html#/year1'},
            {'label': 'Year 2 · Network specialists', 'href': '/learn/osint/campaign-player/index.html#/year2'},
        ]
    }]
    def add_file(id, title, description, kind, filename, mime_type, data, order):
        resources.append({'id': id, 'collection': 'The Campaign Post', 'title': title,
            'description': description, 'kind': kind, 'filename': filename, 'mime_type': mime_type,
            'content_base64': base64.b64encode(data).decode(), 'payload_sha256': sha256(data),
            'byte_length': len(data), 'links': [], 'sort_order': order})
    docx = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    answer = teacher / 'Mandy-Schmear-Answer-Keys-and-Final-Timelines.docx'
    assignment = teacher / 'Campaign-Incident-Response-Report-Assignment-and-Rubric.docx'
    add_file('campaign-answer-key', 'Answer keys & final timelines', 'Complete answer keys for both tracks, with final timelines and teaching notes.',
        'download', answer.name, docx, answer.read_bytes(), 20)
    add_file('campaign-operations-wall', 'Campaign Operations Wall', 'Animated classroom display with profiles, news, and teacher-controlled investigation stages.',
        'display', 'campaign-operations-wall.html', 'text/html', wall_bytes, 30)
    add_file('campaign-report-assignment', 'Incident response report', 'The three-part team assignment and its 100-point rubric.',
        'download', assignment.name, docx, assignment.read_bytes(), 40)
    (output / 'resources.json').write_text(json.dumps(resources, ensure_ascii=False) + '\n')
    # JSON is quoted as a SQL string after escaping apostrophes, never interpolated as SQL code.
    payload = json.dumps(resources, ensure_ascii=False).replace("'", "''")
    sql = """insert into public.instructor_resources
      (id, collection, title, description, kind, filename, mime_type, content_base64,
       payload_sha256, byte_length, links, sort_order)
    select id, collection, title, description, kind, filename, mime_type, content_base64,
       payload_sha256, byte_length, links, sort_order
    from jsonb_to_recordset('""" + payload + """'::jsonb) as r(
      id text, collection text, title text, description text, kind text, filename text,
      mime_type text, content_base64 text, payload_sha256 text, byte_length integer,
      links jsonb, sort_order integer)
    on conflict (id) do update set collection = excluded.collection,
      title = excluded.title, description = excluded.description, kind = excluded.kind,
      filename = excluded.filename, mime_type = excluded.mime_type,
      content_base64 = excluded.content_base64, payload_sha256 = excluded.payload_sha256,
      byte_length = excluded.byte_length, links = excluded.links, sort_order = excluded.sort_order,
      updated_at = now();
"""
    (output / 'publish-resources.sql').write_text(sql)
    print(json.dumps({'resources': [{'id': row['id'], 'bytes': row.get('byte_length', 0)} for row in resources], 'output': str(output), 'csp': hashes}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--teacher-dir', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    build(Path(__file__).resolve().parents[2], args.teacher_dir.resolve(), args.output.resolve())
