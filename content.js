(() => {
    const RULER_ID = 'ruler';
    const SHAPE_CONTAINER_ID = 'shape-container';
    const Shapes = window.ShapesModule;
    const onMessage = chrome?.runtime?.onMessage;

    let updateMousePositionRef = null;
    let keydownHandlerRef = null;
    let isCleanedUp = false;

    const cleanupExtensionInstance = (reason) => {
        if (isCleanedUp) return;

        console.log(`Extension cleanup initiated. Reason: ${reason}`);

        document.getElementById(RULER_ID)?.remove();
        Shapes?.cleanup?.();

        const safeRemoveListener = (element, type, listener) => {
            element?.removeEventListener(type, listener ?? (() => {
            }));
        };

        safeRemoveListener(document, 'mousemove', updateMousePositionRef);
        updateMousePositionRef = null;

        safeRemoveListener(document, 'keydown', keydownHandlerRef);
        keydownHandlerRef = null;

        if (onMessage && messageListenerRef) {
            try {
                onMessage.removeListener(messageListenerRef);
            } catch (e) {
                console.warn(`Error removing message listener (reason: ${reason}):`, e);
            }
        }

        document.body && (document.body.style.cursor = 'default');

        isCleanedUp = true;
    };

    const messageListenerRef = (message, sender) => {
        if (sender.id === chrome.runtime.id && message.command === 'cleanup_extension') {
            cleanupExtensionInstance('cleanup_message_received');
        }

        return false;
    };

    if (onMessage) {
        try {
            onMessage.addListener(messageListenerRef);
        } catch (e) {
            console.error(`Failed to add message listener: ${e.message}`);
        }
    } else {
        console.error(`chrome.runtime.onMessage API not available.`);
    }

    const storageKeys = {
        opacity: 'ruler_opacity',
        lineColor: 'ruler_lineColor',
        lineThickness: 'ruler_lineThickness',
        cursorType: 'ruler_cursorType',
        toolbarVisible: 'ruler_toolbarVisible',
        toolbarPosition: 'ruler_toolbarPosition',
        toggleToolbarKey: 'ruler_toggleToolbarKey',
        toggleExtensionKey: 'ruler_toggleExtensionKey',
        linesVisible: 'ruler_linesVisible',
        shapeOpacity: 'shape_opacity',
        shapeColor: 'shape_color'
    };

    const defaultSettings = {
        [storageKeys.opacity]: 0.1,
        [storageKeys.lineColor]: '#ff0000',
        [storageKeys.lineThickness]: 1,
        [storageKeys.cursorType]: 'default',
        [storageKeys.toolbarVisible]: true,
        [storageKeys.toolbarPosition]: {top: '10px', left: '10px'},
        [storageKeys.toggleToolbarKey]: 'X',
        [storageKeys.toggleExtensionKey]: 'Z',
        [storageKeys.linesVisible]: true,
        [storageKeys.shapeOpacity]: 0.5,
        [storageKeys.shapeColor]: '#00ff00'
    };

    const rulerHTML = `
        <div id="${RULER_ID}" class="ruler">
            <div class="ruler__overlay"></div>
            <div class="ruler__horizontal"></div>
            <div class="ruler__vertical"></div>
            <div class="toolbar">
                <div class="toolbar__header">
                    <span class="toolbar__title">Ruler Settings 1</span>
                    <button class="toolbar__toggle">▲</button>
                </div>
                <div class="toolbar__content">
                    <div class="toolbar__section">
                        <span class="toolbar__section-title">General</span>
                        <div class="toolbar__group">
                            <label class="toolbar__label">Overlay opacity:</label>
                            <input type="range" min="0" max="0.8" step="0.05" class="toolbar__input toolbar__input--range opacitySlider">
                        </div>
                        <div class="toolbar__group">
                            <label class="toolbar__label">Line Thickness:</label>
                            <input type="range" min="1" max="5" class="toolbar__input toolbar__input--range lineThicknessSlider">
                        </div>
                        <div class="toolbar__group">
                            <label class="toolbar__label">Line Color:</label>
                            <input type="color" class="toolbar__input toolbar__input--color lineColorPicker">
                        </div>
                        <div class="toolbar__group">
                            <label class="toolbar__label" for="hideLinesCheckbox">Hide Lines:</label>
                            <input type="checkbox" id="hideLinesCheckbox" class="toolbar__input toolbar__input--checkbox hideLinesCheckbox">
                        </div>
                        <div class="toolbar__group">
                            <label class="toolbar__label">Toggle Toolbar Key:</label>
                            <input type="text" class="toolbar__input toolbar__input--key toggleToolbarKeyInput" maxlength="1">
                            <span class="toolbar__hint">Press key</span>
                        </div>
                        <div class="toolbar__group">
                            <label class="toolbar__label">Toggle Extension Key:</label>
                            <input type="text" class="toolbar__input toolbar__input--key toggleExtensionKeyInput" maxlength="1">
                            <span class="toolbar__hint">Press key</span>
                        </div>
                        <div class="toolbar__group">
                            <label class="toolbar__label">Cursor Type:</label>
                            <select class="toolbar__input toolbar__input--select cursorTypeSelect">
                                <option value="default">Default</option>
                                <option value="none">None</option>
                                <option value="crosshair">Crosshair</option>
                                <option value="all-scroll">All-scroll</option>
                            </select>
                        </div>
                    </div>

                    <div class="toolbar__section">
                        <span class="toolbar__section-title">Shapes</span>
                        <div class="toolbar__group">
                            <label class="toolbar__label">Shape Opacity:</label>
                            <input type="range" min="0.1" max="1" step="0.05" class="toolbar__input toolbar__input--range shapeOpacitySlider">
                        </div>
                        <div class="toolbar__group">
                            <label class="toolbar__label">Shape Color:</label>
                            <input type="color" class="toolbar__input toolbar__input--color shapeColorPicker">
                        </div>
                    </div>

                    <button class="toolbar__button toolbar__button--reset reset-settings-button">Reset Settings</button>
                </div>
            </div>
        </div>
    `;

    const fragment = document.createRange().createContextualFragment(rulerHTML);
    document.body.appendChild(fragment);

    const rulerElement = document.getElementById(RULER_ID);
    if (!rulerElement) {
        console.error(`Ruler element #${RULER_ID} not found.`);
        cleanupExtensionInstance('missing_ruler_element');
        return;
    }

    const horizontalLine = rulerElement.querySelector('.ruler__horizontal');
    const verticalLine = rulerElement.querySelector('.ruler__vertical');
    const overlayElement = rulerElement.querySelector('.ruler__overlay');
    const toolbarContentElement = rulerElement.querySelector('.toolbar__content');
    const opacitySliderElement = rulerElement.querySelector('.opacitySlider');
    const lineColorPickerElement = rulerElement.querySelector('.lineColorPicker');
    const lineThicknessSliderElement = rulerElement.querySelector('.lineThicknessSlider');
    const resetButton = rulerElement.querySelector('.reset-settings-button');
    const cursorTypeSelectElement = rulerElement.querySelector('.cursorTypeSelect');
    const toggleToolbarButtonElement = rulerElement.querySelector('.toolbar__toggle');
    const toggleToolbarKeyInputElement = rulerElement.querySelector('.toggleToolbarKeyInput');
    const toggleExtensionKeyInputElement = rulerElement.querySelector('.toggleExtensionKeyInput');
    const toolbarHeader = rulerElement.querySelector('.toolbar__header');
    const toolbarElement = rulerElement.querySelector('.toolbar');
    const shapeOpacitySlider = rulerElement.querySelector('.shapeOpacitySlider');
    const shapeColorPicker = rulerElement.querySelector('.shapeColorPicker');
    const hideLinesCheckboxElement = rulerElement.querySelector('.hideLinesCheckbox');

    horizontalLine.style.top = '50%';
    verticalLine.style.left = '50%';

    updateMousePositionRef = (event) => {
        if (isCleanedUp) return;

        horizontalLine.style.top = `${event.clientY}px`;
        verticalLine.style.left = `${event.clientX}px`;
    };

    document.addEventListener('mousemove', updateMousePositionRef);

    const applySettings = (items) => {
        if (isCleanedUp) return;

        const settings = {...defaultSettings, ...items};

        const updateElement = (element, property, value) => {
            if (element) {
                element[property] = value;
            }
        };

        const updateStyle = (element, styles) => {
            if (element) {
                Object.assign(element.style, styles);
            }
        };

        updateStyle(overlayElement, {backgroundColor: `rgba(0, 0, 0, ${settings[storageKeys.opacity]})`});
        updateStyle(horizontalLine, {
            backgroundColor: settings[storageKeys.lineColor],
            height: `${settings[storageKeys.lineThickness]}px`
        });
        updateStyle(verticalLine, {
            backgroundColor: settings[storageKeys.lineColor],
            width: `${settings[storageKeys.lineThickness]}px`
        });
        updateElement(opacitySliderElement, 'value', settings[storageKeys.opacity]);
        updateElement(lineColorPickerElement, 'value', settings[storageKeys.lineColor]);
        updateElement(lineThicknessSliderElement, 'value', settings[storageKeys.lineThickness]);
        updateElement(cursorTypeSelectElement, 'value', settings[storageKeys.cursorType]);
        updateElement(shapeOpacitySlider, 'value', settings[storageKeys.shapeOpacity]);
        updateElement(shapeColorPicker, 'value', settings[storageKeys.shapeColor]);
        updateElement(toggleToolbarKeyInputElement, 'value', (
            settings[storageKeys.toggleToolbarKey] !== undefined
                ? settings[storageKeys.toggleToolbarKey]
                : defaultSettings[storageKeys.toggleToolbarKey])
        );
        updateElement(toggleExtensionKeyInputElement, 'value', (
            settings[storageKeys.toggleExtensionKey] !== undefined
                ? settings[storageKeys.toggleExtensionKey]
                : defaultSettings[storageKeys.toggleExtensionKey])
        );

        const linesVisible = settings[storageKeys.linesVisible];
        updateElement(hideLinesCheckboxElement, 'checked', !linesVisible);
        rulerElement?.classList.toggle('lines-hidden', !linesVisible);

        const toolbarVisible = settings[storageKeys.toolbarVisible];
        toolbarContentElement.style.display = toolbarVisible ? 'block' : 'none';
        toggleToolbarButtonElement.textContent = toolbarVisible ? '▲' : '▼';
        toolbarElement?.classList.toggle('toolbar--collapsed', !toolbarVisible);
        Object.assign(toolbarElement.style, (settings[storageKeys.toolbarPosition]?.top && settings[storageKeys.toolbarPosition]?.left)
            ? settings[storageKeys.toolbarPosition]
            : defaultSettings[storageKeys.toolbarPosition]
        );

        document.body.style.cursor = settings[storageKeys.cursorType];

        Shapes?.init?.(
            SHAPE_CONTAINER_ID,
            parseFloat(settings[storageKeys.shapeOpacity] ?? defaultSettings[storageKeys.shapeOpacity]),
            settings[storageKeys.shapeColor] ?? defaultSettings[storageKeys.shapeColor]
        );
    };

    const loadSettings = () => {
        chrome.storage?.local?.get(Object.values(storageKeys), (items) => {
            if (chrome.runtime?.lastError) {
                console.error(`Error loading settings:`, chrome.runtime.lastError.message);
                applySettings({});
            } else {
                applySettings(items || {});
            }
        });
    };

    const saveSetting = (key, value) => {
        chrome.storage?.local?.set({[key]: value}, () => {
            if (chrome.runtime?.lastError) {
                console.error(`Error saving setting ${key}:`, chrome.runtime.lastError.message);
            }
        });
    };

    const handleSliderChange = (sliderElement, storageKey, isFloat, updateCallback) => {
        if (!sliderElement) return;

        sliderElement.addEventListener('input', (event) => {
            if (isCleanedUp) return;

            const value = event.target.value;
            const parsedValue = isFloat ? parseFloat(value) : parseInt(value, 10);
            if (updateCallback) updateCallback(parsedValue);
            saveSetting(storageKey, parsedValue);
        });
    }

    handleSliderChange(opacitySliderElement, storageKeys.opacity, true, (value) => {
        overlayElement.style.backgroundColor = `rgba(0, 0, 0, ${value})`;
    });

    handleSliderChange(lineThicknessSliderElement, storageKeys.lineThickness, false, (value) => {
        const styleValue = `${value}px`;
        horizontalLine.style.height = styleValue;
        verticalLine.style.width = styleValue;
    });

    handleSliderChange(shapeOpacitySlider, storageKeys.shapeOpacity, true, (value) => {
        Shapes?.updateOpacity?.(value);
    });

    lineColorPickerElement.addEventListener('input', (event) => {
        if (isCleanedUp) return;

        const color = event.target.value;
        horizontalLine.style.backgroundColor = color;
        verticalLine.style.backgroundColor = color;
        saveSetting(storageKeys.lineColor, color);
    });

    shapeColorPicker.addEventListener('input', (event) => {
        if (isCleanedUp) return;

        const color = event.target.value;
        Shapes?.updateColor?.(color);
        saveSetting(storageKeys.shapeColor, color);
    });

    cursorTypeSelectElement.addEventListener('change', (event) => {
        if (isCleanedUp) return;

        const cursorType = event.target.value;
        document.body.style.cursor = cursorType;
        saveSetting(storageKeys.cursorType, cursorType);
    });

    hideLinesCheckboxElement.addEventListener('change', (event) => {
        if (isCleanedUp) return;

        const hideLines = event.target.checked;
        rulerElement?.classList.toggle('lines-hidden', hideLines);
        saveSetting(storageKeys.linesVisible, !hideLines);
    });

    resetButton.addEventListener('click', () => {
        if (isCleanedUp) return;

        chrome.storage?.local?.remove(Object.values(storageKeys), () => {
            if (chrome.runtime?.lastError) {
                console.error(`Error clearing settings:`, chrome.runtime.lastError.message);
            } else {
                loadSettings();
            }
        });
    });

    const handleKeyInputChange = (inputElement, storageKey) => {
        inputElement.addEventListener('input', (event) => {
            if (isCleanedUp) return;

            const newKey = event.target.value.toUpperCase();
            if (!newKey) return;
            saveSetting(storageKey, newKey);
        });
    };

    handleKeyInputChange(toggleToolbarKeyInputElement, storageKeys.toggleToolbarKey);
    handleKeyInputChange(toggleExtensionKeyInputElement, storageKeys.toggleExtensionKey);

    const toggleToolbarVisibility = () => {
        if (isCleanedUp || !toolbarElement || !toolbarContentElement || !toggleToolbarButtonElement) return;

        const isVisible = !toolbarElement.classList.contains('toolbar--collapsed');
        toolbarContentElement.style.display = isVisible ? 'none' : 'block';
        toolbarElement.classList.toggle('toolbar--collapsed', isVisible);
        saveSetting(storageKeys.toolbarVisible, !isVisible);
        toggleToolbarButtonElement.textContent = isVisible ? '▼' : '▲';
    };

    toggleToolbarButtonElement.addEventListener('click', toggleToolbarVisibility);

    let isExtensionVisible = true;
    const toggleExtensionVisibility = () => {
        if (isCleanedUp || !rulerElement) return;

        isExtensionVisible = !isExtensionVisible;
        Shapes?.toggleVisibility?.(isExtensionVisible);
        rulerElement.style.display = isExtensionVisible ? 'block' : 'none';
        document.body.style.cursor = isExtensionVisible ? cursorTypeSelectElement.value : 'default';
    };

    keydownHandlerRef = (event) => {
        if (isCleanedUp) return;

        const key = event.key.toUpperCase();
        const targetToolbarKey = toggleToolbarKeyInputElement?.value?.toUpperCase();
        const targetExtensionKey = toggleExtensionKeyInputElement?.value?.toUpperCase();

        if (key === targetToolbarKey) {
            toggleToolbarVisibility();
        } else if (key === targetExtensionKey) {
            toggleExtensionVisibility();
        }
    };

    document.addEventListener('keydown', keydownHandlerRef);

    const makeElementDraggable = (element, handle) => {
        if (!element || !handle) return;

        let isDragging = false;
        let offsetX, offsetY;

        const onMouseMove = (event) => {
            if (!isDragging) return;

            const rect = handle.getBoundingClientRect();
            const maxX = window.innerWidth - rect.width;
            const maxY = window.innerHeight - rect.height;
            let newX = event.clientX - offsetX;
            let newY = event.clientY - offsetY;

            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));

            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        };

        const onMouseUp = () => {
            if (!isDragging) return;

            isDragging = false;
            handle.style.cursor = 'grab';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            saveSetting(storageKeys.toolbarPosition, {top: element.style.top, left: element.style.left});
        };

        handle.addEventListener('mousedown', (event) => {
            isDragging = true;
            handle.style.cursor = 'grabbing';

            const rect = element.getBoundingClientRect();
            offsetX = event.clientX - rect.left;
            offsetY = event.clientY - rect.top;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    };

    makeElementDraggable(toolbarElement, toolbarHeader);

    loadSettings();
})();
