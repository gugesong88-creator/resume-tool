import re

with open('resume_chatgpt_stable_clean_v9.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find the start of TEMPLATES
start_templates = html.find('const TEMPLATES = [')

# Find the end of renderModuleHTML
# renderModuleHTML is a function. Let's find its end by searching for the next major block
end_render_module = html.find('// v4. RICH TEXT COLOR TOOLS')

if start_templates == -1 or end_render_module == -1:
    print("Could not find start or end bounds.")
    exit(1)

# Extract the block
extracted_block = html[start_templates:end_render_module].strip()

# Create the new JS file
with open('src/templates/index.js', 'w', encoding='utf-8') as f:
    f.write("""// ============================================================
// TEMPLATE ENGINE & REGISTRY
// ============================================================

window.AppTemplates = window.AppTemplates || {};

""")
    f.write(extracted_block)
    
    # Expose to global scope
    f.write("""

// Expose globally for legacy code compatibility
window.TEMPLATES = TEMPLATES;
window.getTemplate = getTemplate;
window.renderResumeHTML = renderResumeHTML;
window.renderModuleHTML = renderModuleHTML;
""")

# Remove the extracted block from HTML and inject the script tag
# We'll replace it with a marker
new_html = html[:start_templates] + '/* Templates engine moved to src/templates/index.js */\n' + html[end_render_module:]

# Inject the script tag right after store.js
new_html = new_html.replace('<script src="./src/store.js"></script>', '<script src="./src/store.js"></script>\n<script src="./src/templates/index.js"></script>')

with open('resume_chatgpt_stable_clean_v9.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("Extraction successful.")
