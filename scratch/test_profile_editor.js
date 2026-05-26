const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Listen to page errors and console messages
  page.on('console', msg => {
    console.log(`PAGE LOG: [${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    console.error(`PAGE ERROR: ${err.toString()}`);
    process.exit(1);
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`HTTP STATUS ${response.status()}: ${response.url()}`);
    }
  });

  console.log('Navigating to http://localhost:8000/#profile ...');
  await page.goto('http://localhost:8000/#profile', { waitUntil: 'networkidle2' });

  console.log('Waiting for #profile-editor-left and #profile-a4-preview...');
  await page.waitForSelector('#profile-editor-left', { timeout: 5000 });
  await page.waitForSelector('#profile-a4-preview', { timeout: 5000 });

  // Evaluate if elements are populated
  const leftHtml = await page.evaluate(() => document.getElementById('profile-editor-left').innerHTML);
  const previewHtml = await page.evaluate(() => document.getElementById('profile-a4-preview').innerHTML);

  console.log('Left editor panel HTML length:', leftHtml.length);
  console.log('Right A4 preview HTML length:', previewHtml.length);

  if (leftHtml.length === 0) {
    console.error('FAIL: Left editor panel is empty!');
    process.exit(1);
  }
  if (previewHtml.length === 0) {
    console.error('FAIL: A4 preview canvas is empty!');
    process.exit(1);
  }

  // Check if contenteditable is set to true on editable elements in preview
  const editableCount = await page.evaluate(() => {
    const editables = document.querySelectorAll('#profile-a4-preview [data-editable]');
    let count = 0;
    editables.forEach(el => {
      if (el.getAttribute('data-editable') === 'basic_info._photo') return;
      if (el.getAttribute('contenteditable') === 'true') count++;
    });
    return count;
  });
  console.log(`Found ${editableCount} contenteditable="true" fields in profile preview.`);
  if (editableCount === 0) {
    console.error('FAIL: No editable fields found in profile preview!');
    process.exit(1);
  }

  console.log('Testing E2E Bidirectional Sync & Rich Text Bold...');
  const nameSelector = '#profile-a4-preview [data-editable="basic_info.name"]';
  
  // Set value and bold in preview, then blur
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    el.focus();
    el.innerHTML = '<b>测试姓名加粗</b>';
    el.dispatchEvent(new Event('blur'));
  }, nameSelector);

  // Small delay for React/Dom event loop
  await new Promise(r => setTimeout(r, 100));

  // Check if left name input is updated to plain text
  const debugInfo = await page.evaluate((sel) => {
    const input = document.querySelector('input[placeholder="张三"]');
    return {
      inputHtml: input ? input.outerHTML : 'Not found',
      inputValue: input ? input.value : null,
      profileEditData: window.profileEditData
    };
  }, nameSelector);
  console.log('DEBUG INFO:', JSON.stringify(debugInfo, null, 2));

  const leftNameVal = debugInfo.inputValue;
  if (leftNameVal !== '测试姓名加粗') {
    console.error('FAIL: Left input value did not update or did not strip bold tag correctly!');
    process.exit(1);
  }

  // Check if right preview retains bold tag
  const previewNameHtml = await page.evaluate((sel) => {
    return document.querySelector(sel).innerHTML;
  }, nameSelector);
  console.log('Preview name HTML after editing:', previewNameHtml);
  if (!previewNameHtml.includes('<b>测试姓名加粗</b>') && !previewNameHtml.includes('<strong>测试姓名加粗</strong>')) {
    console.error('FAIL: Preview name did not keep bold formatting!');
    process.exit(1);
  }

  console.log('SUCCESS: Bidirectional E2E verification passed successfully!');
  await browser.close();
})();
