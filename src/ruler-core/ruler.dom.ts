export function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    if (target.isContentEditable) {
        return true;
    }

    const editableAncestor = target.closest(
        'input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]'
    );

    return editableAncestor instanceof HTMLElement;
}
