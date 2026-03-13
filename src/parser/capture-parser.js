export function capturedPayloadToFormData(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid capture payload.');
  }

  const fields = Array.isArray(payload.fields) ? payload.fields : [];

  const questions = fields.slice(0, 120).map((f, i) => {
    const rawType = String(f?.type || 'text').toLowerCase();
    const label = String(f?.label || `Field ${i + 1}`).trim() || `Field ${i + 1}`;
    const required = Boolean(f?.required);
    const options = Array.isArray(f?.options) ? f.options.map(o => String(o).trim()).filter(Boolean).slice(0, 80) : [];

    const typeMap = {
      textarea: 'long_text',
      long_text: 'long_text',
      text: 'short_text',
      short_text: 'short_text',
      email: 'short_text',
      tel: 'short_text',
      phone: 'short_text',
      number: 'short_text',
      date: 'date',
      time: 'short_text',
      select: 'dropdown',
      dropdown: 'dropdown',
      radio: 'radio',
      checkbox: 'checkbox',
      file: 'file_upload',
      file_upload: 'file_upload'
    };

    const normalizedType = typeMap[rawType] || (options.length ? 'dropdown' : 'short_text');

    return {
      id: String(i + 1),
      text: label,
      type: normalizedType,
      required,
      options
    };
  });

  return {
    title: String(payload.title || 'Captured Form').trim() || 'Captured Form',
    description: String(payload.description || '').trim(),
    url: String(payload.pageUrl || '').trim(),
    source: 'Captured',
    parseStrategy: 'capture_v1',
    authRequired: false,
    questions
  };
}

