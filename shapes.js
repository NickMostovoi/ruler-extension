window.ShapesModule = (() => {
    const SHAPE_CONTAINER_ID = 'shape-container';

    let shapes = [];
    let shapeCounter = 0;
    let isDrawing = false;
    let isResizing = false;
    let isDragging = false;
    let currentShapeElement = null;
    let startX = 0;
    let startY = 0;
    let resizeHandle = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let activeShape = null;
    let shapeContainer = null;
    let currentOpacity = 0.5;
    let currentColor = '#00ff00';
    let initialRectData = null;

    let onMouseMove = null;
    let onMouseUp = null;
    let onDocumentClick = null;
    let onResizeMouseMove = null;
    let onResizeMouseUp = null;
    let onDragMouseMove = null;
    let onDragMouseUp = null;

    function initShapeModule(rulerElement, initialOpacity, initialColor) {
        if (shapeContainer) {
            cleanupShapes();
        }

        currentOpacity = initialOpacity;
        currentColor = initialColor;
        shapes = [];
        shapeCounter = 0;
        activeShape = null;
        isDrawing = isResizing = isDragging = false;

        shapeContainer = document.createElement('div');
        shapeContainer.id = SHAPE_CONTAINER_ID;
        rulerElement.appendChild(shapeContainer);

        onMouseMove = handleMouseMove.bind(null);
        onMouseUp = handleMouseUp.bind(null);
        onDocumentClick = handleDocumentClick.bind(null);
        onResizeMouseMove = handleResizeMouseMove.bind(null);
        onResizeMouseUp = handleResizeMouseUp.bind(null);
        onDragMouseMove = handleDragMouseMove.bind(null);
        onDragMouseUp = handleDragMouseUp.bind(null);

        shapeContainer.addEventListener('mousedown', handleMouseDown);
    }

    function handleMouseDown(event) {
        if (event.target !== shapeContainer || event.button !== 0 || isResizing || isDragging) {
            return;
        }

        isDrawing = true;
        startX = event.clientX;
        startY = event.clientY;

        const shapeId = `shape-${shapeCounter++}`;
        currentShapeElement = document.createElement('div');
        currentShapeElement.id = shapeId;
        currentShapeElement.className = 'shape';

        Object.assign(currentShapeElement.style, {
            left: `${startX}px`,
            top: `${startY}px`,
            width: '0px',
            height: '0px',
            backgroundColor: hexToRgba(currentColor, currentOpacity)
        });

        const sizeDisplay = document.createElement('div');
        sizeDisplay.className = 'shape-size-display';
        currentShapeElement.appendChild(sizeDisplay);
        updateSizeDisplay(currentShapeElement, 0, 0);
        shapeContainer?.appendChild(currentShapeElement);

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    function handleMouseMove(event) {
        if (!isDrawing || !currentShapeElement) return;

        const width = Math.abs(event.clientX - startX);
        const height = Math.abs(event.clientY - startY);
        const newLeft = Math.min(event.clientX, startX);
        const newTop = Math.min(event.clientY, startY);

        Object.assign(currentShapeElement.style, {
            width: `${width}px`,
            height: `${height}px`,
            left: `${newLeft}px`,
            top: `${newTop}px`
        });

        updateSizeDisplay(currentShapeElement, width, height);
    }

    function handleMouseUp(event) {
        if (!isDrawing || event.button !== 0) return;

        isDrawing = false;

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        if (currentShapeElement) {
            const finalWidth = parseInt(currentShapeElement.style.width);
            const finalHeight = parseInt(currentShapeElement.style.height);

            if (finalWidth < 5 || finalHeight < 5) {
                currentShapeElement.remove();
            } else {
                addInteraction(currentShapeElement);
                shapes.push(currentShapeElement);
                updateSizeDisplay(currentShapeElement, finalWidth, finalHeight);
            }

            currentShapeElement = null;
        }
    }

    function updateSizeDisplay(shapeElement, width, height) {
        const display = shapeElement?.querySelector('.shape-size-display');
        if (display) display.textContent = `${Math.round(width)} x ${Math.round(height)}`;
    }

    function addInteraction(shapeElement) {
        shapeElement.addEventListener('dblclick', handleShapeDoubleClick);
        shapeElement.addEventListener('mousedown', handleDragStart);
    }

    function handleShapeDoubleClick(event) {
        event.stopPropagation();

        if (event.button !== 0) return;

        const shapeElement = event.currentTarget;
        if (shapeElement.classList.contains('active')) {
            deactivateShape(shapeElement);
        } else {
            activateShape(shapeElement);
        }
    }

    function activateShape(shapeElement) {
        if (!shapeElement || shapeElement.classList.contains('active')) return;

        activeShape = shapeElement;
        shapeElement.classList.add('active');
        addResizeHandles(shapeElement);
        addDeleteButton(shapeElement);
        updateSizeDisplay(shapeElement, parseInt(shapeElement.style.width), parseInt(shapeElement.style.height));

        document.addEventListener('click', onDocumentClick, true);
    }

    function deactivateShape(shapeElement) {
        if (!shapeElement || !shapeElement.classList.contains('active')) return;

        shapeElement.classList.remove('active');
        removeInteractionControls(shapeElement);

        if (activeShape === shapeElement) {
            activeShape = null;
            document.removeEventListener('click', onDocumentClick, true);
        }
    }

    function handleDocumentClick(event) {
        if (activeShape?.contains(event.target)) return;
        if (activeShape) deactivateShape(activeShape);
    }

    function removeInteractionControls(shapeElement) {
        shapeElement?.querySelectorAll('.resize-handle, .delete-button').forEach(el => el.remove());
    }

    function addResizeHandles(shapeElement) {
        removeInteractionControls(shapeElement);
        const handlePositions = ['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'];
        handlePositions.forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `resize-handle ${pos}-handle`;
            handle.dataset.direction = pos;
            shapeElement.appendChild(handle);
            handle.addEventListener('mousedown', handleResizeStart);
        });
    }

    function handleResizeStart(event) {
        event.stopPropagation();

        if (event.button !== 0) return;

        isResizing = true;
        resizeHandle = event.target;
        activeShape = resizeHandle.closest('.shape');

        if (!activeShape) {
            isResizing = false;
            return;
        }

        startX = event.clientX;
        startY = event.clientY;
        const style = window.getComputedStyle(activeShape);
        initialRectData = {
            left: parseFloat(style.left), top: parseFloat(style.top),
            width: parseFloat(style.width), height: parseFloat(style.height)
        };

        document.addEventListener('mousemove', onResizeMouseMove);
        document.addEventListener('mouseup', onResizeMouseUp);
    }

    function handleResizeMouseMove(event) {
        if (!isResizing || !activeShape || !resizeHandle || !initialRectData) return;

        const direction = resizeHandle.dataset.direction;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        let {left: newX, top: newY, width: newWidth, height: newHeight} = initialRectData;

        if (direction.includes('e')) newWidth += dx;
        else if (direction.includes('w')) {
            newWidth -= dx;
            newX += dx;
        }
        if (direction.includes('s')) newHeight += dy;
        else if (direction.includes('n')) {
            newHeight -= dy;
            newY += dy;
        }

        const minSize = 10;
        if (newWidth < minSize) {
            if (direction.includes('w')) newX = initialRectData.left + initialRectData.width - minSize;
            newWidth = minSize;
        }
        if (newHeight < minSize) {
            if (direction.includes('n')) newY = initialRectData.top + initialRectData.height - minSize;
            newHeight = minSize;
        }

        Object.assign(activeShape.style, {
            left: `${newX}px`,
            top: `${newY}px`,
            width: `${newWidth}px`,
            height: `${newHeight}px`
        });

        updateSizeDisplay(activeShape, newWidth, newHeight);
    }

    function handleResizeMouseUp(event) {
        if (!isResizing || event.button !== 0) return;

        isResizing = false;

        if (activeShape) {
            updateSizeDisplay(activeShape, parseInt(activeShape.style.width), parseInt(activeShape.style.height));
        }
        initialRectData = null;
        resizeHandle = null;

        document.removeEventListener('mousemove', onResizeMouseMove);
        document.removeEventListener('mouseup', onResizeMouseUp);
    }

    function handleDragStart(event) {
        const target = event.currentTarget;

        if (!target.classList.contains('active') ||
            event.target.classList.contains('resize-handle') ||
            event.target.classList.contains('delete-button') ||
            event.button !== 0 || isResizing || isDrawing) {
            return;
        }

        event.stopPropagation();
        isDragging = true;
        activeShape = target;
        activeShape.style.cursor = 'grabbing';
        const {left, top} = window.getComputedStyle(activeShape);
        dragOffsetX = event.clientX - parseFloat(left);
        dragOffsetY = event.clientY - parseFloat(top);

        document.addEventListener('mousemove', onDragMouseMove);
        document.addEventListener('mouseup', onDragMouseUp);
    }

    function handleDragMouseMove(event) {
        if (!isDragging || !activeShape) return;

        Object.assign(activeShape.style, {
            left: `${event.clientX - dragOffsetX}px`,
            top: `${event.clientY - dragOffsetY}px`
        });
    }

    function handleDragMouseUp(event) {
        if (!isDragging || event.button !== 0) return;

        isDragging = false;

        if (activeShape) {
            activeShape.style.cursor = '';
        }

        document.removeEventListener('mousemove', onDragMouseMove);
        document.removeEventListener('mouseup', onDragMouseUp);
    }

    function addDeleteButton(shapeElement) {
        const deleteBtn = document.createElement('div');

        deleteBtn.className = 'delete-button';
        deleteBtn.innerHTML = 'X';
        shapeElement.appendChild(deleteBtn);

        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (event.button !== 0) return;

            const shapeToRemove = event.target.closest('.shape');
            if (shapeToRemove) {
                const index = shapes.indexOf(shapeToRemove);
                if (index > -1) shapes.splice(index, 1);
                shapeToRemove.remove();
                if (activeShape === shapeToRemove) activeShape = null;
            }
        });
    }

    function updateShapeOpacity(opacity) {
        currentOpacity = Math.max(0, Math.min(1, opacity));
        shapes.forEach(shape => {
            if (shape) shape.style.backgroundColor = hexToRgba(currentColor, currentOpacity);
        });
    }

    function updateShapeColor(color) {
        currentColor = color;
        shapes.forEach(shape => {
            if (shape) shape.style.backgroundColor = hexToRgba(currentColor, currentOpacity);
        });
    }

    function hexToRgba(hex, alpha) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        if (hex.length !== 6) return `rgba(255,0,0,${alpha})`;
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
    }

    function cleanupShapes() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('click', onDocumentClick, true);
        document.removeEventListener('mousemove', onResizeMouseMove);
        document.removeEventListener('mouseup', onResizeMouseUp);
        document.removeEventListener('mousemove', onDragMouseMove);
        document.removeEventListener('mouseup', onDragMouseUp);

        shapeContainer?.remove();

        shapes = [];
        shapeContainer = null;
        activeShape = null;
        isDrawing = isResizing = isDragging = false;
        currentShapeElement = null;
        onMouseMove = onMouseUp = onDocumentClick = null;
        onResizeMouseMove = onResizeMouseUp = null;
        onDragMouseMove = onDragMouseUp = null;
    }

    function toggleShapeVisibility(visible) {
        if (shapeContainer) {
            const active = shapeContainer.querySelector('.shape.active');
            if (!visible) deactivateShape(active);
        }
    }

    return {
        init: initShapeModule,
        updateOpacity: updateShapeOpacity,
        updateColor: updateShapeColor,
        cleanup: cleanupShapes,
        toggleVisibility: toggleShapeVisibility
    };
})();
