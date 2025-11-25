import { useEffect, useRef, useState } from 'react';

export default function Grid({ 
    color = "rgba(94, 117, 141, 0.1)", 
    size = "20vh", 
    container = false,
    className = "",
    blur = "0.5px",
    gridId, // Remove default value!
    key
}) {
    const gridRef = useRef(null);
    const canvasRef = useRef(null);
    const [mounted, setMounted] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [clientId, setClientId] = useState(gridId || null);

    // Generate id only on client
    useEffect(() => {
        if (!gridId) {
            setClientId(`grid-${Math.random().toString(36).substring(2, 15)}`);
        }
    }, [gridId]);
    
    // Draw grid on canvas - much more reliable than CSS grid
    const drawGrid = () => {
        if (!canvasRef.current || !gridRef.current) return;
        
        // Get container dimensions
        const container = gridRef.current;
        const rect = container.getBoundingClientRect();
        
        // Set canvas size to match container (accounting for device pixel ratio)
        const dpr = window.devicePixelRatio || 1;
        const canvas = canvasRef.current;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        
        // Get sizing
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
        // Clear canvas
        ctx.clearRect(0, 0, rect.width, rect.height);
        
        // Calculate grid size in pixels
        let gridSize = size;
        if (size.endsWith('vh')) {
            const vh = window.innerHeight / 100;
            gridSize = parseFloat(size) * vh;
        } else if (size.endsWith('vw')) {
            const vw = window.innerWidth / 100;
            gridSize = parseFloat(size) * vw;
        } else if (size.endsWith('px')) {
            gridSize = parseFloat(size);
        } else {
            gridSize = parseFloat(size);
        }
        
        // Parse color
        ctx.strokeStyle = color;
        
        // Apply blur via shadow (if needed)
        if (parseFloat(blur) > 0) {
            ctx.shadowColor = color;
            ctx.shadowBlur = parseFloat(blur);
        }
        
        // Set line width - slightly thicker to ensure visibility
        ctx.lineWidth = 1.5 / dpr;
        
        // Draw vertical lines
        for (let x = 0; x <= rect.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, rect.height);
            ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= rect.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(rect.width, y);
            ctx.stroke();
        }
    };
    
    // Handle resize
    const handleResize = () => {
        const container = gridRef.current;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        setDimensions({
            width: rect.width,
            height: rect.height
        });
        
        // Slight delay to ensure correct measurement after layout
        setTimeout(drawGrid, 10);
    };
    
    // Initialize grid on mount
    useEffect(() => {
        if (gridRef.current) {
            handleResize();
            setMounted(true);
            
            // Initial render with delay for reliability
            setTimeout(drawGrid, 100);
        }
        
        // Clean up
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);
    
    // Add resize listener after mount
    useEffect(() => {
        if (mounted) {
            window.addEventListener('resize', handleResize);
            return () => {
                window.removeEventListener('resize', handleResize);
            };
        }
    }, [mounted]);
    
    // Redraw when props change
    useEffect(() => {
        if (mounted) {
            drawGrid();
        }
    }, [color, size, blur, dimensions, mounted]);
    
    return (
        <div 
            className={`grid ${container ? 'grid--container' : ''} ${className}`}
            ref={gridRef}
            id={clientId ? clientId : undefined}
            data-testid="grid-component"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                zIndex: 1,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    pointerEvents: 'none',
                    opacity: 0.99, // Slightly under 1 to avoid pixel-perfect optimizations
                }}
            />
        </div>
    );
}