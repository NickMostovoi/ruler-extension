window.ShapesModule = (() => {
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
    let shapeContainerId = 'shape-container';
    let currentOpacity = 0.5;
    let currentColor = '#00ff00';
    let initialRectData = null;

    let boundHandleMouseMove = null;
    let boundHandleMouseUp = null;
    let boundHandleDocumentClick = null;
    let boundHandleResizeMouseMove = null;
    let boundHandleResizeMouseUp = null;
    let boundHandleDragMouseMove = null;
    let boundHandleDragMouseUp = null;

    function initShapeModule(containerIdParam, initialOpacity, initialColor) {
        if (shapeContainer) {
            cleanupShapes();
        }

        shapeContainerId = containerIdParam || shapeContainerId;
        currentOpacity = initialOpacity;
        currentColor = initialColor;
        shapes = [];
        shapeCounter = 0;
        activeShape = null;
        isDrawing = isResizing = isDragging = false;

        shapeContainer = document.createElement('div');
        shapeContainer.id = shapeContainerId;
        document.body.appendChild(shapeContainer);

        boundHandleMouseMove = handleMouseMove.bind(null);
        boundHandleMouseUp = handleMouseUp.bind(null);
        boundHandleDocumentClick = handleDocumentClick.bind(null);
        boundHandleResizeMouseMove = handleResizeMouseMove.bind(null);
        boundHandleResizeMouseUp = handleResizeMouseUp.bind(null);
        boundHandleDragMouseMove = handleDragMouseMove.bind(null);
        boundHandleDragMouseUp = handleDragMouseUp.bind(null);

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
        currentShapeElement.style.left = `${startX}px`;
        currentShapeElement.style.top = `${startY}px`;
        currentShapeElement.style.width = '0px';
        currentShapeElement.style.height = '0px';
        currentShapeElement.style.backgroundColor = hexToRgba(currentColor, currentOpacity);

        const sizeDisplay = document.createElement('div');
        sizeDisplay.className = 'shape-size-display';
        currentShapeElement.appendChild(sizeDisplay);
        updateSizeDisplay(currentShapeElement, 0, 0);

        shapeContainer?.appendChild(currentShapeElement);

        document.addEventListener('mousemove', boundHandleMouseMove);
        document.addEventListener('mouseup', boundHandleMouseUp);
    }

    function handleMouseMove(event) {
        if (!isDrawing || !currentShapeElement) return;

        const width = Math.abs(event.clientX - startX);
        const height = Math.abs(event.clientY - startY);
        const newLeft = Math.min(event.clientX, startX);
        const newTop = Math.min(event.clientY, startY);

        currentShapeElement.style.width = `${width}px`;
        currentShapeElement.style.height = `${height}px`;
        currentShapeElement.style.left = `${newLeft}px`;
        currentShapeElement.style.top = `${newTop}px`;

        updateSizeDisplay(currentShapeElement, width, height);
    }

    function handleMouseUp(event) {
        if (!isDrawing || event.button !== 0) return;
        isDrawing = false;

        document.removeEventListener('mousemove', boundHandleMouseMove);
        document.removeEventListener('mouseup', boundHandleMouseUp);

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

        if (display) {
            display.textContent = `${Math.round(width)} x ${Math.round(height)}`;
        }
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

        document.addEventListener('click', boundHandleDocumentClick, true);
    }

    function deactivateShape(shapeElement) {
        if (!shapeElement || !shapeElement.classList.contains('active')) return;

        shapeElement.classList.remove('active');
        removeInteractionControls(shapeElement);

        if (activeShape === shapeElement) {
            activeShape = null;

            document.removeEventListener('click', boundHandleDocumentClick, true);
        }
    }

    function handleDocumentClick(event) {
        if (activeShape?.contains(event.target)) {
            return;
        }

        if (activeShape) {
            deactivateShape(activeShape);
        }
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

        document.addEventListener('mousemove', boundHandleResizeMouseMove);
        document.addEventListener('mouseup', boundHandleResizeMouseUp);
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

        activeShape.style.left = `${newX}px`;
        activeShape.style.top = `${newY}px`;
        activeShape.style.width = `${newWidth}px`;
        activeShape.style.height = `${newHeight}px`;

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

        document.removeEventListener('mousemove', boundHandleResizeMouseMove);
        document.removeEventListener('mouseup', boundHandleResizeMouseUp);
    }

    function handleDragStart(event) {
        if (!event.currentTarget.classList.contains('active') ||
            event.target.classList.contains('resize-handle') ||
            event.target.classList.contains('delete-button') ||
            event.button !== 0 || isResizing || isDrawing) {
            return;
        }

        event.stopPropagation();
        isDragging = true;
        activeShape = event.currentTarget;
        activeShape.style.cursor = 'grabbing';

        const style = window.getComputedStyle(activeShape);
        dragOffsetX = event.clientX - parseFloat(style.left);
        dragOffsetY = event.clientY - parseFloat(style.top);

        document.addEventListener('mousemove', boundHandleDragMouseMove);
        document.addEventListener('mouseup', boundHandleDragMouseUp);
    }

    function handleDragMouseMove(event) {
        if (!isDragging || !activeShape) return;

        activeShape.style.left = `${event.clientX - dragOffsetX}px`;
        activeShape.style.top = `${event.clientY - dragOffsetY}px`;
    }

    function handleDragMouseUp(event) {
        if (!isDragging || event.button !== 0) return;
        isDragging = false;

        if (activeShape) {
            activeShape.style.cursor = '';
        }

        document.removeEventListener('mousemove', boundHandleDragMouseMove);
        document.removeEventListener('mouseup', boundHandleDragMouseUp);
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
        if (boundHandleMouseMove) document.removeEventListener('mousemove', boundHandleMouseMove);
        if (boundHandleMouseUp) document.removeEventListener('mouseup', boundHandleMouseUp);
        if (boundHandleDocumentClick) document.removeEventListener('click', boundHandleDocumentClick, true);
        if (boundHandleResizeMouseMove) document.removeEventListener('mousemove', boundHandleResizeMouseMove);
        if (boundHandleResizeMouseUp) document.removeEventListener('mouseup', boundHandleResizeMouseUp);
        if (boundHandleDragMouseMove) document.removeEventListener('mousemove', boundHandleDragMouseMove);
        if (boundHandleDragMouseUp) document.removeEventListener('mouseup', boundHandleDragMouseUp);

        shapeContainer?.remove();

        shapes = [];
        shapeContainer = null;
        activeShape = null;
        isDrawing = isResizing = isDragging = false;
        currentShapeElement = null;
        boundHandleMouseMove = boundHandleMouseUp = boundHandleDocumentClick = null;
        boundHandleResizeMouseMove = boundHandleResizeMouseUp = null;
        boundHandleDragMouseMove = boundHandleDragMouseUp = null;
    }

    function toggleShapeVisibility(visible) {
        if (shapeContainer) {
            shapeContainer.style.display = visible ? 'block' : 'none';

            const shapeElement = shapeContainer.querySelector('.shape.active');
            if (!visible) deactivateShape(shapeElement);
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
