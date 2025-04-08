(() => {
    const rulerId = "ruler";
    const existingRuler = document.getElementById(rulerId);

    if (existingRuler) {
        existingRuler.remove();
        return;
    }

    const storageKeys = {
        opacity: 'ruler_opacity',
        lineColor: 'ruler_lineColor',
        lineThickness: 'ruler_lineThickness',
        cursorType: 'ruler_cursorType',
        toolbarVisible: 'ruler_toolbarVisible',
        toolbarPosition: 'ruler_toolbarPosition',
        toggleToolbarKey: 'ruler_toggleToolbarKey',
        toggleExtensionKey: 'ruler_toggleExtensionKey'
    };

    const defaultSettings = {
        [storageKeys.opacity]: 0.2,
        [storageKeys.lineColor]: '#ff0000',
        [storageKeys.lineThickness]: 1,
        [storageKeys.cursorType]: 'default',
        [storageKeys.toolbarVisible]: true,
        [storageKeys.toolbarPosition]: {top: '10px', left: '10px'},
        [storageKeys.toggleToolbarKey]: 'X',
        [storageKeys.toggleExtensionKey]: 'Z'
    };

    const rulerHTML = `
        <div id="ruler" class="ruler">
            <div class="ruler__overlay"></div>
            <div class="ruler__horizontal"></div>
            <div class="ruler__vertical"></div>
            <div class="toolbar">
                <div class="toolbar__header">
                    <span class="toolbar__title">Ruler Settings</span>
                    <button class="toolbar__toggle">▲</button>
                </div>
                <div class="toolbar__content">
                    <div class="toolbar__group">
                        <label class="toolbar__label">Toggle Toolbar Key:</label>
                        <input type="text" class="toolbar__input toolbar__input--key toggleToolbarKeyInput" value="${defaultSettings[storageKeys.toggleToolbarKey]}" maxlength="1">
                        <span class="toolbar__hint">Press key</span>
                    </div>

                    <div class="toolbar__group">
                        <label class="toolbar__label">Toggle Extension Key:</label>
                        <input type="text" class="toolbar__input toolbar__input--key toggleExtensionKeyInput" value="${defaultSettings[storageKeys.toggleExtensionKey]}" maxlength="1">
                        <span class="toolbar__hint">Press key</span>
                    </div>

                    <hr>

                    <div class="toolbar__group">
                        <label class="toolbar__label">Overlay opacity:</label>
                        <input type="range" min="0" max="0.8" step="0.05" value="${defaultSettings[storageKeys.opacity]}" class="toolbar__input toolbar__input--range opacitySlider">
                    </div>

                    <div class="toolbar__group">
                        <label class="toolbar__label">Line Thickness:</label>
                        <input type="range" min="1" max="5" value="${defaultSettings[storageKeys.lineThickness]}" class="toolbar__input toolbar__input--range lineThicknessSlider">
                    </div>

                    <div class="toolbar__group">
                        <label class="toolbar__label">Line Color:</label>
                        <input type="color" class="toolbar__input toolbar__input--color lineColorPicker" value="${defaultSettings[storageKeys.lineColor]}">
                    </div>

                    <hr>

                    <div class="toolbar__group">
                        <label class="toolbar__label">Cursor Type:</label>
                        <select class="toolbar__input toolbar__input--select cursorTypeSelect">
                            <option value="default">Default</option>
                            <option value="none">None</option>
                            <option value="crosshair">Crosshair</option>
                            <option value="all-scroll">All-scroll</option>
                        </select>
                    </div>

                    <hr>

                    <button class="toolbar__button toolbar__button--reset reset-settings-button">Reset Settings</button>
                </div>
            </div>
        </div>
    `;

    const fragment = document.createRange().createContextualFragment(rulerHTML);
    document.body.appendChild(fragment);

    const rulerElement = document.getElementById(rulerId);
    const horizontalLine = rulerElement.querySelector('.ruler__horizontal');
    const verticalLine = rulerElement.querySelector('.ruler__vertical');
    const overlayElement = rulerElement.querySelector('.ruler__overlay');
    const toolbarContentElement = rulerElement.querySelector('.toolbar__content');
    const opacitySliderElement = rulerElement.querySelector('.toolbar__input--range.opacitySlider');
    const lineColorPickerElement = rulerElement.querySelector('.toolbar__input--color.lineColorPicker');
    const lineThicknessSliderElement = rulerElement.querySelector('.toolbar__input--range.lineThicknessSlider');
    const resetButton = rulerElement.querySelector('.toolbar__button--reset.reset-settings-button');
    const cursorTypeSelectElement = rulerElement.querySelector('.toolbar__input--select.cursorTypeSelect');
    const toggleToolbarButtonElement = rulerElement.querySelector('.toolbar__toggle');
    const toggleToolbarKeyInputElement = rulerElement.querySelector('.toolbar__input--key.toggleToolbarKeyInput');
    const toggleExtensionKeyInputElement = rulerElement.querySelector('.toolbar__input--key.toggleExtensionKeyInput');
    const toolbarHeader = document.querySelector('.toolbar__header');
    const toolbarElement = rulerElement.querySelector('.toolbar');

    horizontalLine.style.top = '50%';
    verticalLine.style.left = '50%';

    const updateMousePosition = (event) => {
        horizontalLine.style.top = `${event.clientY}px`;
        verticalLine.style.left = `${event.clientX}px`;
    };

    document.addEventListener("mousemove", updateMousePosition);

    const applySettings = (items) => {
        const settings = {...defaultSettings, ...items};

        overlayElement.style.backgroundColor = `rgba(0, 0, 0, ${settings[storageKeys.opacity]})`;
        opacitySliderElement.value = settings[storageKeys.opacity];

        horizontalLine.style.backgroundColor = settings[storageKeys.lineColor];
        horizontalLine.style.height = `${settings[storageKeys.lineThickness]}px`;
        verticalLine.style.backgroundColor = settings[storageKeys.lineColor];
        verticalLine.style.width = `${settings[storageKeys.lineThickness]}px`;

        lineColorPickerElement.value = settings[storageKeys.lineColor];
        lineThicknessSliderElement.value = settings[storageKeys.lineThickness];

        cursorTypeSelectElement.value = settings[storageKeys.cursorType];
        document.body.style.cursor = settings[storageKeys.cursorType];

        const toolbarVisible = settings[storageKeys.toolbarVisible];
        toolbarContentElement.style.display = toolbarVisible ? 'block' : 'none';

        if (toolbarElement) {
            Object.assign(toolbarElement.style, settings[storageKeys.toolbarPosition]);
        }

        toggleToolbarKeyInputElement.value = settings[storageKeys.toggleToolbarKey].toUpperCase();
        toggleExtensionKeyInputElement.value = settings[storageKeys.toggleExtensionKey].toUpperCase();
    };

    const loadSettings = () => {
        chrome.storage.local.get(Object.values(storageKeys), applySettings);
    };

    const saveSetting = (key, value) => {
        chrome.storage.local.set({[key]: value});
    };

    loadSettings();

    const handleSliderChange = (sliderElement, storageKey, unit = '') => {
        sliderElement.addEventListener('input', (event) => {
            const value = event.target.value;
            const isThickness = storageKey.includes('Thickness');
            const parsedValue = isThickness ? parseInt(value, 10) : value;
            const styleValue = isThickness ? parsedValue + unit : value;

            switch (storageKey) {
                case storageKeys.opacity:
                    overlayElement.style.backgroundColor = `rgba(0, 0, 0, ${styleValue})`;
                    break;

                case storageKeys.lineThickness:
                    horizontalLine.style.height = styleValue;
                    verticalLine.style.width = styleValue;
                    break;
            }

            saveSetting(storageKey, parsedValue);
        });
    };

    handleSliderChange(opacitySliderElement, storageKeys.opacity);
    handleSliderChange(lineThicknessSliderElement, storageKeys.lineThickness, 'px');

    lineColorPickerElement.addEventListener('input', (event) => {
        const color = event.target.value;
        horizontalLine.style.backgroundColor = color;
        verticalLine.style.backgroundColor = color;
        saveSetting(storageKeys.lineColor, color);
    });

    resetButton.addEventListener('click', () => {
        chrome.storage.local.set(defaultSettings, loadSettings);
    });

    cursorTypeSelectElement.addEventListener('change', (event) => {
        const cursorType = event.target.value;
        document.body.style.cursor = cursorType;
        saveSetting(storageKeys.cursorType, cursorType);
    });

    const handleKeyInputChange = (inputElement, storageKey) => {
        inputElement.addEventListener('input', (event) => {
            const newKey = event.target.value.toUpperCase();
            if (!newKey) return;
            saveSetting(storageKey, newKey);
        });
    };

    handleKeyInputChange(toggleToolbarKeyInputElement, storageKeys.toggleToolbarKey);
    handleKeyInputChange(toggleExtensionKeyInputElement, storageKeys.toggleExtensionKey);

    const toggleToolbarVisibility = () => {
        const isVisible = toolbarElement?.classList?.contains('toolbar--collapsed');
        toolbarContentElement.style.display = isVisible ? 'block' : 'none';
        toolbarElement.classList.toggle('toolbar--collapsed', !isVisible);
        saveSetting(storageKeys.toolbarVisible, isVisible);

        if (toggleToolbarButtonElement) {
            toggleToolbarButtonElement.textContent = isVisible ? '▲' : '▼';
        }
    };

    toggleToolbarButtonElement.addEventListener('click', toggleToolbarVisibility);

    let isExtensionVisible = true;
    const toggleExtensionVisibility = () => {
        isExtensionVisible = !isExtensionVisible;

        if (rulerElement) {
            rulerElement.style.display = isExtensionVisible ? 'block' : 'none';
        }
    };

    const keydownHandler = (event) => {
        const key = event.key.toUpperCase();

        if (key === toggleToolbarKeyInputElement?.value?.toUpperCase()) {
            toggleToolbarVisibility();
        } else if (key === toggleExtensionKeyInputElement?.value?.toUpperCase()) {
            toggleExtensionVisibility();
        }
    }

    document.addEventListener('keydown', keydownHandler);

    const makeElementDraggable = (element, handle) => {
        if (!element || !handle) {
            console.log('Element not found to set drag handlers');
            return;
        }

        let isDragging = false;
        let offsetX, offsetY;

        const onMouseMove = (event) => {
            if (!isDragging) return;
            const maxX = window.innerWidth - handle.offsetWidth;
            const maxY = window.innerHeight - handle.offsetHeight;
            let newX = event.clientX - offsetX;
            let newY = event.clientY - offsetY;

            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));

            element.style.left = newX + 'px';
            element.style.top = newY + 'px';
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

            if (toolbarElement) {
                offsetX = event.clientX - toolbarElement.getBoundingClientRect().left;
                offsetY = event.clientY - toolbarElement.getBoundingClientRect().top;
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    };

    makeElementDraggable(toolbarElement, toolbarHeader);
})();
