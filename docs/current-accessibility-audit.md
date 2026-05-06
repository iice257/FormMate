# Current Accessibility Audit

Generated from current TypeScript source on 2026-05-06T19:46:40.280Z.

Total findings: 55

## Summary

- Icon button may be unnamed: 55

## Findings

- src/components/account-modal.ts:128 - Icon button may be unnamed - `<button class="account-modal-vault-bar" id="account-modal-open-vault" type="button">`
- src/components/account-modal.ts:136 - Icon button may be unnamed - `<button class="account-modal-signout" id="account-modal-signout" type="button">`
- src/components/layout.ts:453 - Icon button may be unnamed - `<button id="nav-${link.id}" class="layout-sidebar-link ${extraClass} ${isActive ? 'active' : ''}" aria-current="${isActive ? 'page' : 'false'}">`
- src/components/layout.ts:469 - Icon button may be unnamed - `<button id="nav-mobile-${link.id}" class="layout-sidebar-link ${isActive ? 'active' : ''}" aria-current="${isActive ? 'page' : 'false'}">`
- src/components/layout.ts:773 - Icon button may be unnamed - `<button type="button" class="layout-search-result ${index === 0 ? 'is-active' : ''}" data-action-id="${escapeHtml(action.id)}" >`
- src/components/ui-components.ts:55 - Icon button may be unnamed - `<button data-modal-close="${id}" class="p-2 hover:bg-slate-100 rounded-lg transition-colors" style="color: var(--fm-text-secondary);">`
- src/screens/accounts.ts:34 - Icon button may be unnamed - `<button type="button" class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors w-full text-left" style="color: var(--fm-text-secondary);" data-nav="dash`
- src/screens/accounts.ts:37 - Icon button may be unnamed - `<button type="button" class="flex items-center gap-3 px-3 py-2 rounded-lg font-medium cursor-pointer w-full text-left" style="background: var(--fm-primary-50); color: var(--fm-prim`
- src/screens/accounts.ts:40 - Icon button may be unnamed - `<button type="button" class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors w-full text-left" style="color: var(--fm-text-secondary);" id="sidebar-na`
- src/screens/accounts.ts:43 - Icon button may be unnamed - `<button type="button" class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors w-full text-left" style="color: var(--fm-text-secondary);" data-nav="docs`
- src/screens/accounts.ts:54 - Icon button may be unnamed - `<button id="btn-back" class="bg-slate-900 text-white px-5 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg hover:bg-slate-800 transition-all btn-press">`
- src/screens/accounts.ts:136 - Icon button may be unnamed - `<button id="btn-add-vault" class="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 btn-press" style="background: var(--fm-primary-50); color: var(--fm-primary);">`
- src/screens/accounts.ts:207 - Icon button may be unnamed - `<button id="btn-export" class="h-10 px-5 rounded-xl text-xs font-bold flex items-center gap-2 btn-press" style="border: 1px solid var(--fm-border); color: var(--fm-text);">`
- src/screens/accounts.ts:263 - Icon button may be unnamed - `<button id="btn-signout" class="w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 btn-press" style="border: 1px solid var(--fm-border); color: var`
- src/screens/accounts.ts:266 - Icon button may be unnamed - `<button id="btn-delete-account" class="w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 btn-press" style="background: var(--fm-error-light); colo`
- src/screens/ai-chat.ts:327 - Icon button may be unnamed - `<button type="button" class="chat-followup-chip" data-followup-msg="${escapeAttr(prompt)}">`
- src/screens/analytics.ts:54 - Icon button may be unnamed - `<button type="button" class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors w-full text-left" style="color: var(--fm-text-secondary);" data-nav="dash`
- src/screens/analytics.ts:57 - Icon button may be unnamed - `<button type="button" class="flex items-center gap-3 px-3 py-2 rounded-lg font-medium cursor-pointer w-full text-left" style="background: var(--fm-primary-50); color: var(--fm-prim`
- src/screens/analytics.ts:67 - Icon button may be unnamed - `<button id="btn-back" class="bg-slate-900 text-white px-5 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg hover:bg-slate-800 transition-all btn-press">`
- src/screens/analyzing.ts:31 - Icon button may be unnamed - `<button id="btn-back-header" class="bg-slate-900 text-white px-5 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg hover:bg-slate-800 transition-all btn-press">`
- src/screens/analyzing.ts:42 - Icon button may be unnamed - `<button id="btn-cancel" class="flex items-center justify-center rounded-full size-10 bg-slate-200/50 text-slate-600 hover:bg-slate-200 transition-colors">`
- src/screens/auth.ts:185 - Icon button may be unnamed - `<button type="button" id="btn-back-signup" class="flex items-center gap-1 text-xs font-semibold mb-6 hover:underline" style="color: var(--fm-primary);">`
- src/screens/auth.ts:236 - Icon button may be unnamed - `<button type="button" id="btn-back-login" class="flex items-center gap-1 text-xs font-semibold mb-6 hover:underline" style="color: var(--fm-primary);">`
- src/screens/capture.ts:161 - Icon button may be unnamed - `<button id="btn-back" class="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium text-sm btn-press">`
- src/screens/capture.ts:195 - Icon button may be unnamed - `<button id="btn-copy-bookmarklet" class="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition`
- src/screens/dashboard.ts:123 - Icon button may be unnamed - `<button id="btn-dashboard-open-workspace" class="app-button-primary dashboard-primary-action btn-press">`
- src/screens/dashboard.ts:127 - Icon button may be unnamed - `<button id="btn-dashboard-open-history" class="app-button-secondary dashboard-secondary-action btn-press">`
- src/screens/docs.ts:124 - Icon button may be unnamed - `<button type="button" class="docs-home-button bg-primary text-white px-5 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-da`
- src/screens/docs.ts:137 - Icon button may be unnamed - `<button id="btn-clear-search" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors hidden">`
- src/screens/docs.ts:143 - Icon button may be unnamed - `<button id="btn-ask-ai-search" class="text-[11px] font-bold text-slate-500 hover:text-primary transition-colors flex items-center justify-center gap-1.5 w-full">`
- src/screens/docs.ts:485 - Icon button may be unnamed - `<button id="btn-submit-feedback" class="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:brightness-110 transition-all btn-press flex items-center gap`
- src/screens/docs.ts:533 - Icon button may be unnamed - `<button id="btn-submit-contact" class="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:brightness-110 transition-all btn-press flex items-center gap-`
- src/screens/docs.ts:658 - Icon button may be unnamed - `<button type="button" class="docs-search-result w-full text-left p-2 hover:bg-slate-50 rounded-lg transition-colors group" data-doc-target="${item.id}">`
- src/screens/docs.ts:810 - Icon button may be unnamed - `<button type="button" class="chat-followup-chip" data-followup-msg="${escapeAttr(prompt)}">`
- src/screens/docs.ts:1003 - Icon button may be unnamed - `<button type="button" class="chat-followup-chip" data-followup-msg="${escapeAttr(prompt)}">`
- src/screens/help.ts:31 - Icon button may be unnamed - `<button type="button" class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors w-full text-left" style="color: var(--fm-text-secondary);" data-nav="dash`
- src/screens/help.ts:34 - Icon button may be unnamed - `<button type="button" class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors w-full text-left" style="color: var(--fm-text-secondary);" data-nav="acco`
- src/screens/help.ts:37 - Icon button may be unnamed - `<button type="button" class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors w-full text-left" style="color: var(--fm-text-secondary);" data-nav="acco`
- src/screens/help.ts:40 - Icon button may be unnamed - `<button type="button" class="flex items-center gap-3 px-3 py-2 rounded-lg font-medium cursor-pointer w-full text-left" style="background: var(--fm-primary-50); color: var(--fm-prim`
- src/screens/help.ts:66 - Icon button may be unnamed - `<button id="btn-docs" class="h-10 px-5 rounded-xl text-sm font-bold bg-white text-[var(--fm-primary)] btn-press flex items-center gap-2">`
- src/screens/help.ts:69 - Icon button may be unnamed - `<button id="btn-contact" class="h-10 px-5 rounded-xl text-sm font-bold text-white btn-press flex items-center gap-2" style="background: rgba(255,255,255,0.2);">`
- src/screens/help.ts:72 - Icon button may be unnamed - `<button id="btn-review-feedback" class="h-10 px-5 rounded-xl text-sm font-bold text-white btn-press flex items-center gap-2" style="background: rgba(255,255,255,0.2);">`
- src/screens/legal.ts:39 - Icon button may be unnamed - `<button type="button" class="docs-home-button bg-slate-900 text-white px-5 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg hover:bg-slate-800 transition-all b`
- src/screens/new-form.ts:58 - Icon button may be unnamed - `<button id="btn-back" class="bg-slate-900 text-white px-5 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg hover:bg-slate-800 transition-all btn-press">`
- src/screens/not-found.ts:76 - Icon button may be unnamed - `<button type="button" id="btn-go-home" class="not-found-action not-found-action-primary">`
- src/screens/not-found.ts:80 - Icon button may be unnamed - `<button type="button" id="btn-explore-examples" class="not-found-action not-found-action-secondary">`
- src/screens/review.ts:71 - Icon button may be unnamed - `<button class="btn-edit-review p-2 text-slate-400 hover:text-primary transition-colors shrink-0" data-question-id="${escapeAttr(q.id)}">`
- src/screens/review.ts:93 - Icon button may be unnamed - `<button id="btn-back" class="p-2 hover:bg-slate-100 rounded-lg transition-colors">`
- src/screens/review.ts:101 - Icon button may be unnamed - `<button id="btn-close" class="flex items-center justify-center rounded-full size-10 bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">`
- src/screens/review.ts:146 - Icon button may be unnamed - `<button id="btn-fill-disabled" class="w-full flex items-center justify-center gap-2 rounded-xl h-14 bg-slate-100 text-slate-400 font-bold text-lg border border-slate-200 cursor-not`
- src/screens/success.ts:74 - Icon button may be unnamed - `<button class="flex-1 flex items-center justify-center gap-2 rounded-xl h-12 px-6 bg-primary text-white text-sm font-bold transition-all hover:bg-primary/90 shadow-md shadow-primar`
- src/screens/success.ts:78 - Icon button may be unnamed - `<button class="flex-1 flex items-center justify-center gap-2 rounded-xl h-12 px-6 bg-slate-100 text-slate-900 text-sm font-bold transition-all hover:bg-slate-200 btn-press">`
- src/screens/success.ts:102 - Icon button may be unnamed - `<button class="flex items-center justify-center gap-2 rounded-lg h-10 px-6 bg-primary/10 text-primary text-sm font-bold w-fit hover:bg-primary hover:text-white transition-all btn-p`
- src/screens/success.ts:131 - Icon button may be unnamed - `<button id="btn-new-form" class="w-full flex items-center justify-center gap-2 rounded-xl h-12 bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-colors bt`
- src/screens/workspace.ts:183 - Icon button may be unnamed - `<button id="btn-review-bottom-2" class="btn-press workspace-bottom-submit">`
