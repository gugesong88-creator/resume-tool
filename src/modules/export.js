// src/modules/export.js
// Consolidates all export functionalities (PDF, Markdown, JSON)

(function() {
    function buildRobustOptions(name) {
        return {
            margin: 0,
            filename: (name || '简历') + '.pdf',
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: 794,
                windowWidth: 794,
                x: 0,
                y: 0,
                scrollX: 0,
                scrollY: 0
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
    }

    const ISOLATED_CSS = 'width:794px;min-height:1123px;padding:48px 52px;background:#fff;box-sizing:border-box;position:fixed;left:0;top:0;z-index:-9999;margin:0;border:none;transform:none;';

    window.exportMarkdown = function(id) {
        let r = null;
        if (typeof id === 'string') {
            const store = window.loadStore();
            if (store && store.resumes) {
                r = store.resumes.find(res => res.id === id);
            }
        } else if (typeof window.editState !== 'undefined' && window.editState && window.editState.resume) {
            r = window.editState.resume;
        }
        
        if (!r) { 
            if(typeof showToast === 'function') showToast('未找到该简历数据'); 
            return; 
        }
        
        let md = '# ' + (r.name || '未命名简历') + '\n\n';
        
        const bi = r.modules && r.modules.basic_info ? r.modules.basic_info.data : null;
        if (bi) {
            const contacts = [];
            if(bi.phone) contacts.push(bi.phone);
            if(bi.email) contacts.push(bi.email);
            if(bi.github) contacts.push(bi.github);
            if(bi.website) contacts.push(bi.website);
            if(contacts.length > 0) md += contacts.join(' | ') + '\n\n';
        } else if (r.contact) {
            const contacts = [];
            if(r.contact.phone) contacts.push(r.contact.phone);
            if(r.contact.email) contacts.push(r.contact.email);
            if(r.contact.github) contacts.push(r.contact.github);
            if(r.contact.website) contacts.push(r.contact.website);
            if(contacts.length > 0) md += contacts.join(' | ') + '\n\n';
        }

        const sections = r.modules && r.modules.custom_sections ? r.modules.custom_sections : [];
        sections.forEach(sec => {
            md += `## ${sec.title}\n\n`;
            if (sec.items && Array.isArray(sec.items)) {
                sec.items.forEach(item => {
                    md += `### ${item.title || ''}\n`;
                    const subs = [];
                    if(item.subtitle) subs.push(item.subtitle);
                    if(item.date) subs.push(item.date);
                    if(subs.length > 0) md += `*${subs.join(' · ')}*\n\n`;
                    if(item.desc) {
                        let text = item.desc.replace(/<br\s*[\/]?>/gi, '\n');
                        text = text.replace(/<[^>]+>/g, '');
                        md += text + '\n\n';
                    }
                });
            }
        });

        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${r.name || 'resume'}.md`;
        a.click();
        URL.revokeObjectURL(url);
        if(typeof showToast === 'function') showToast('Markdown 纯文本已导出');
    };

    window.exportPDF = function() {
        if (typeof window.editState === 'undefined' || !window.editState) return;
        if (window.editState.dirty && typeof window.saveCurrentResume === 'function') window.saveCurrentResume();
        
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
        }
        
        const canvas = document.getElementById('a4-preview');
        const name = window.editState.resume.name || '简历';

        const tempDiv = document.createElement('div');
        tempDiv.className = canvas.className;
        tempDiv.style.cssText = ISOLATED_CSS;
        
        // Apply dynamic theme color to the cloned node
        const f = window.editState.formatting || {};
        const t = window.getTemplate(window.editState.resume.template_id);
        const tc = f.themeColor || t.accent || '#374151';
        tempDiv.style.setProperty('--accent', tc);
        
        // Apply dynamic margins
        const marginY = f.marginY !== undefined ? f.marginY : 48;
        const marginX = f.marginX !== undefined ? f.marginX : 52;
        tempDiv.style.setProperty('padding', `${marginY}px ${marginX}px`, 'important');
        
        // Avoid page break inside or after canvas
        tempDiv.style.setProperty('page-break-after', 'avoid', 'important');
        tempDiv.style.setProperty('page-break-inside', 'avoid', 'important');
        
        tempDiv.innerHTML = canvas.innerHTML;
        
        // Clear focus outline styles
        tempDiv.querySelectorAll('[data-editable]').forEach(el => {
            el.style.outline = '';
            el.style.outlineOffset = '';
        });
        
        document.body.appendChild(tempDiv);

        // Check if one page and enforce height
        const warning = document.getElementById('page-overflow-warning');
        const isOnePage = !warning || warning.style.display === 'none';
        if (isOnePage) {
            tempDiv.style.setProperty('height', '1123px', 'important');
            tempDiv.style.setProperty('overflow', 'hidden', 'important');
        }

        if(typeof showToast === 'function') showToast('正在执行渲染，请稍候...');
        
        if (typeof html2pdf !== 'function') {
            document.body.removeChild(tempDiv);
            if(typeof showToast === 'function') showToast('错误：缺少 html2pdf 库');
            return;
        }

        html2pdf().set(buildRobustOptions(name)).from(tempDiv).save().then(() => {
            document.body.removeChild(tempDiv);
            if(typeof showToast === 'function') showToast('✅ 导出成功（快速版）');
        }).catch(e => {
            document.body.removeChild(tempDiv);
            console.error('PDF导出异常:', e);
            if(typeof showToast === 'function') showToast('❌ 渲染引擎阻断，请查看控制台');
        });
    };

    window.quickExport = function(id) {
        let r = null;
        const store = window.loadStore();
        if (store && store.resumes) {
            r = store.resumes.find(res => res.id === id);
        }
        if (!r) {
            alert('执行中断：未捕获有效实体');
            return;
        }

        if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
        }

        const t = window.getTemplate ? window.getTemplate(r.template_id) : { cssClass: '' };
        const html = window.renderResumeHTML ? window.renderResumeHTML(t, r.modules, r.meta) : '';

        const tempDiv = document.createElement('div');
        tempDiv.className = 'a4-canvas ' + t.cssClass;
        tempDiv.style.cssText = ISOLATED_CSS;
        
        // Apply dynamic theme color to the cloned node
        const f = r.formatting || {};
        const tc = f.themeColor || t.accent || '#374151';
        tempDiv.style.setProperty('--accent', tc);

        // Apply dynamic margins
        const marginY = f.marginY !== undefined ? f.marginY : 48;
        const marginX = f.marginX !== undefined ? f.marginX : 52;
        tempDiv.style.setProperty('padding', `${marginY}px ${marginX}px`, 'important');

        // Avoid page break inside or after canvas
        tempDiv.style.setProperty('page-break-after', 'avoid', 'important');
        tempDiv.style.setProperty('page-break-inside', 'avoid', 'important');

        tempDiv.innerHTML = html;

        // Clear focus outline styles
        tempDiv.querySelectorAll('[data-editable]').forEach(el => {
            el.style.outline = '';
            el.style.outlineOffset = '';
        });

        if (typeof window.decodeEscapedRichTextInPreview === 'function') window.decodeEscapedRichTextInPreview(tempDiv);
        if (r.formatting && typeof window.applyFormattingToElements === 'function') window.applyFormattingToElements(tempDiv, r.formatting);

        // Apply dynamic module spacing
        const moduleSpacing = f.moduleSpacing !== undefined ? f.moduleSpacing : 8;
        const sections = tempDiv.querySelectorAll('.section');
        sections.forEach(sec => {
            sec.style.marginTop = `${moduleSpacing}px`;
        });

        document.body.appendChild(tempDiv);

        // Check if one page and enforce height
        const isOnePage = tempDiv.scrollHeight <= 1125;
        if (isOnePage) {
            tempDiv.style.setProperty('height', '1123px', 'important');
            tempDiv.style.setProperty('overflow', 'hidden', 'important');
        }

        if(typeof showToast === 'function') showToast('正在生成预览 PDF...');
        
        if (typeof html2pdf !== 'function') {
            document.body.removeChild(tempDiv);
            if(typeof showToast === 'function') showToast('错误：缺少 html2pdf 库');
            return;
        }

        html2pdf().set(buildRobustOptions(r.name)).from(tempDiv).save().then(() => {
            document.body.removeChild(tempDiv);
            if(typeof showToast === 'function') showToast('✅ 导出成功');
        }).catch(e => {
            document.body.removeChild(tempDiv);
            console.error('PDF导出异常:', e);
            if(typeof showToast === 'function') showToast('❌ 渲染引擎阻断，请查看控制台');
        });
    };

    window.exportVectorPDF = function() {
        if (!window.editState) return;
        if (window.editState.dirty && typeof window.saveCurrentResume === 'function') window.saveCurrentResume();

        if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
        }

        const t = window.getTemplate(window.editState.resume.template_id);
        const name = window.editState.resume.name || '简历';
        const canvas = document.getElementById('a4-preview');

        const f = window.editState.formatting || {};
        const tc = f.themeColor || t.accent || '#374151';
        const printFontFamily = (f.fontFamily && f.fontFamily !== 'default') ? f.fontFamily : '';
        const printNameSize = Number(f.nameSize) || parseInt(t.fontName) || 24;
        const printHeadingSize = Number(f.headingSize) || parseInt(t.fontHead) || 14;
        const printBodySize = Number(f.bodySize) || parseFloat(t.fontBody) || 11;
        const printLineHeight = Number(f.lineHeight) || parseFloat(t.lineHeight) || 1.5;

        // Clone canvas and strip residual inline focus outline styles
        const tempCanvas = canvas.cloneNode(true);
        tempCanvas.querySelectorAll('[data-editable]').forEach(el => {
            el.style.outline = '';
            el.style.outlineOffset = '';
        });
        const resumeHTML = tempCanvas.innerHTML;
        const cssClass = t.cssClass;
        const allStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(s => s.outerHTML).join('\n');

        const printFormatCss = `
            .print-page .a4-canvas { ${printFontFamily ? `font-family: ${printFontFamily} !important;` : ''} }
            .print-page .resume-name { font-size: ${printNameSize}px !important; }
            .print-page .section-title { font-size: ${printHeadingSize}px !important; }
            .print-page .resume-contact, .print-page .resume-contact-line1, .print-page .resume-contact-line2, .print-page .resume-contact-line3,
            .print-page .contact-item, .print-page .exp-desc, .print-page .exp-desc li, .print-page .exp-sub, .print-page .skill-tag, .print-page .skill-tags,
            .print-page .skill-list, .print-page .exp-header, .print-page .exp-header .exp-left, .print-page .exp-header .exp-right, .print-page .info-table td,
            .print-page .resume-intention, .print-page .exp-table, .print-page .exp-table td { font-size: ${printBodySize}px !important; }
            .print-page .exp-desc, .print-page .exp-desc li, .print-page .resume-contact, .print-page .resume-contact-line1, .print-page .resume-contact-line2,
            .print-page .resume-contact-line3, .print-page .skill-list { line-height: ${printLineHeight} !important; }
        `;

        const printWindow = window.open('', '_blank', 'width=1000,height=900');
        if (!printWindow) {
            if(typeof showToast === 'function') showToast('请允许弹出窗口以导出 PDF');
            return;
        }

        const marginY = f.marginY !== undefined ? Number(f.marginY) : 48;
        const marginX = f.marginX !== undefined ? Number(f.marginX) : 52;
        const marginYmm = (marginY * 25.4 / 96).toFixed(2);
        const marginXmm = (marginX * 25.4 / 96).toFixed(2);

        const warning = document.getElementById('page-overflow-warning');
        const isOnePage = !warning || warning.style.display === 'none';

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <base href="${window.location.href}">
                <meta charset="UTF-8">
                <title>${window.escHtml ? window.escHtml(name) : name}</title>
                ${allStyles}
                <style>
                    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; width: 210mm; ${isOnePage ? 'height: 297mm !important; overflow: hidden !important;' : 'min-height: 297mm;'} }
                    @page { size: A4 portrait; margin: 0; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print-page { width: 210mm !important; ${isOnePage ? 'height: 297mm !important; overflow: hidden !important;' : 'min-height: 297mm !important;'} box-sizing: border-box !important; background: #fff !important; margin: 0 auto !important; padding: ${marginYmm}mm ${marginXmm}mm !important; }
                    .print-page .a4-canvas { width: 100% !important; min-height: auto !important; height: auto !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; background: #fff !important; box-sizing: border-box !important; page-break-after: avoid !important; page-break-inside: avoid !important; }
                    ${printFormatCss}
                    .a4-canvas [data-editable], .a4-canvas [data-editable]:hover, .a4-canvas [data-editable]:focus { outline: none !important; background: none !important; }
                    .inline-add-btn, .entry-delete-btn, .section-actions, .resume-photo-placeholder { display: none !important; }
                    @media print {
                        html, body { margin: 0 !important; padding: 0 !important; width: 210mm !important; ${isOnePage ? 'height: 297mm !important; overflow: hidden !important;' : 'min-height: 297mm !important;'} background: #fff !important; }
                        .top-nav, .editor-toolbar, .formatting-bar, .editor-left, .editor-left-toggle, .toast, .modal-overlay { display: none !important; }
                        .print-page { width: 210mm !important; ${isOnePage ? 'height: 297mm !important; overflow: hidden !important;' : 'min-height: 297mm !important;'} padding: ${marginYmm}mm ${marginXmm}mm !important; margin: 0 !important; box-sizing: border-box !important; }
                        .print-page .a4-canvas { width: 100% !important; min-height: auto !important; height: auto !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; page-break-after: avoid !important; page-break-inside: avoid !important; }
                    }
                </style>
            </head>
            <body>
                <div class="print-page">
                    <div class="a4-canvas ${cssClass}" style="--accent: ${tc}">${resumeHTML}</div>
                </div>
                <script>
                    window.onload = function() { setTimeout(function() { window.print(); }, 500); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        if(typeof showToast === 'function') showToast('已打开打印对话框，选择“另存为 PDF”即可导出矢量 PDF');
    };

    window.exportSingleEntity = function(id) {
        const store = window.loadStore();
        const r = store && store.resumes ? store.resumes.find(res => res.id === id) : null;
        if (!r) {
            alert('执行中断：未捕获有效实体');
            return;
        }
        const payload = JSON.stringify({source: 'single_export', resume: r}, null, 2);
        const blob = new Blob([payload], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resume_entity_${r.name}.json`;
        a.click();
        URL.revokeObjectURL(url);
        if(typeof showToast === 'function') showToast(`单份简历 [${r.name}] 已导出为 JSON`);
    };

})();
