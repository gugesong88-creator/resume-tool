// scratch/test_pdf_export.js
// Automated test script to verify PDF export margin and page count styling fixes.

const puppeteer = require('puppeteer');

(async () => {
    let browser;
    try {
        console.log('🚀 Launching Puppeteer...');
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

        console.log('🌐 Navigating to resume tool...');
        await page.goto('http://localhost:8000/resume_chatgpt_stable_clean_v9.html', {
            waitUntil: 'networkidle0'
        });

        // Wait for resumes to load
        console.log('⏳ Waiting for resume list...');
        await page.waitForSelector('.resume-card', { timeout: 5000 });

        // Click the "继续编辑" button on the first resume card
        console.log('🖱️ Clicking "继续编辑" button...');
        await page.click('.resume-card .btn-primary');

        // Wait for editor UI to be visible
        await page.waitForSelector('#fmt-margin-y', { visible: true, timeout: 5000 });
        console.log('✅ Editor UI loaded.');

        // Mock window.open to intercept exportVectorPDF
        console.log('🔧 Injecting window.open mock...');
        await page.evaluate(() => {
            window._printedHTML = null;
            window.open = (url, name, specs) => {
                console.log('Mocked window.open called with specs:', specs);
                const mockWindow = {
                    document: {
                        write: (html) => {
                            window._printedHTML = html;
                        },
                        close: () => {
                            console.log('Mocked close called');
                        }
                    }
                };
                return mockWindow;
            };
        });

        // Adjust margins to 0 in the UI
        console.log('✏️ Setting top/bottom margin to 0...');
        await page.evaluate(() => {
            const marginYInput = document.getElementById('fmt-margin-y');
            marginYInput.value = 0;
            // Trigger change event to apply the formatting
            marginYInput.dispatchEvent(new Event('change'));
        });

        // Focus an editable element to simulate editing
        console.log('✍️ Focusing an editable element to trigger outlines...');
        await page.evaluate(() => {
            const editableEl = document.querySelector('[data-editable]');
            if (editableEl) {
                editableEl.focus();
                console.log('Focused element:', editableEl.getAttribute('data-editable'));
            }
        });

        // Click the "矢量导出 PDF" button
        console.log('🖱️ Clicking "矢量导出 PDF" button...');
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const exportBtn = buttons.find(b => b.textContent.includes('矢量导出 PDF'));
            if (!exportBtn) throw new Error('Could not find "矢量导出 PDF" button');
            exportBtn.click();
        });

        // Wait a moment for window.open to be called
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get the printed HTML
        const printedHTML = await page.evaluate(() => window._printedHTML);
        if (!printedHTML) {
            throw new Error('❌ Failed: window.open was not intercepted or document.write was not called');
        }

        console.log('🔍 Analyzing printed page HTML...');

        // 1. Assert margin top/bottom padding on .print-page is 0.00mm
        const paddingRegex = /\.print-page\s*\{[^}]*padding:\s*0\.00mm\s+[^;!}]*/i;
        if (!paddingRegex.test(printedHTML)) {
            // Let's output what was found in printed HTML for padding
            const styleStart = printedHTML.indexOf('<style>');
            const styleEnd = printedHTML.indexOf('</style>');
            const styleBlock = printedHTML.substring(styleStart, styleEnd + 8);
            console.error('Style block for debugging:\n', styleBlock);
            throw new Error('❌ Test Failed: .print-page padding is not set to 0.00mm when marginY = 0');
        }
        console.log('💚 Success: .print-page padding is exactly 0.00mm.');

        // 2. Assert page-break-after: avoid on .a4-canvas
        if (!printedHTML.includes('page-break-after: avoid !important') || !printedHTML.includes('page-break-inside: avoid !important')) {
            throw new Error('❌ Test Failed: .a4-canvas page-break rules are not set to avoid');
        }
        console.log('💚 Success: page-break rules set to avoid on A4 canvas.');

        // 3. Assert no inline outline styles exist in the exported HTML
        // Let's check both for the inline styles that the JS sets: "outline:" and "outline-offset"
        const cleanHTMLRegex = /style="[^"]*outline\s*:/i;
        if (cleanHTMLRegex.test(printedHTML) || printedHTML.includes('outline-offset: 2px')) {
            // Check if it's in a style tag (which is allowed) vs inline style attribute
            // We search for elements with inline style attribute containing outline
            const hasInlineOutline = printedHTML.includes('style="outline:') || printedHTML.includes('style="outline-offset:') || printedHTML.includes('2px solid var(--accent)');
            if (hasInlineOutline) {
                console.error('HTML dump around data-editable elements:\n', printedHTML.substring(printedHTML.indexOf('data-editable'), printedHTML.indexOf('data-editable') + 500));
                throw new Error('❌ Test Failed: Inline outline styles remain on elements during print!');
            }
        }
        console.log('💚 Success: Inline outline border styles cleared successfully from print HTML.');

        // 4. Assert 1-page height restriction is applied since the overflow warning is not visible
        const pageWarningVisible = await page.evaluate(() => {
            const warning = document.getElementById('page-overflow-warning');
            return warning && warning.style.display !== 'none';
        });

        if (!pageWarningVisible) {
            console.log('ℹ️ Resume is under 1 page. Checking one-page height styles...');
            if (!printedHTML.includes('height: 297mm !important') || !printedHTML.includes('overflow: hidden !important')) {
                throw new Error('❌ Test Failed: One-page height restriction styling is missing or incorrect');
            }
            console.log('💚 Success: One-page height and overflow styling verified.');
        } else {
            console.log('ℹ️ Resume exceeds 1 page. Height restriction should not be forced (flows naturally).');
        }

        console.log('🎉 All automated tests PASSED successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error running test:', error);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
