export function inlineLoadingIndicator(color = 'gray', size = 30) {
  // Calculate sizes based on the base size
  const dotSize = size / 8;
  const spacing = size / 4;
  const animationDuration = 0.6;

  return `
        <svg viewBox="0 0 ${size} ${size}" width="${size * 1.7}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <style>
                .bounce-dot {
                    fill: ${color};
                    animation: bounce ${animationDuration}s infinite ease-in-out;
                    transform-origin: center;
                }
                .dot1 { animation-delay: -${animationDuration * 0.15}s; }
                .dot2 { animation-delay: -${animationDuration * 0.3}s; }
                .dot3 { animation-delay: -${animationDuration * 0.45}s; }
                
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-${size * 0.2}px); }
                }
            </style>
            
            <circle class="bounce-dot dot1" cx="${spacing}" cy="${size / 2}" r="${dotSize}" />
            <circle class="bounce-dot dot2" cx="${spacing * 2 + dotSize}" cy="${size / 2}" r="${dotSize}" />
            <circle class="bounce-dot dot3" cx="${spacing * 3 + dotSize * 2}" cy="${size / 2}" r="${dotSize}" />
        </svg>
    `;
}

// Loading Indicator Module
export const loadingIndicator = (() => {
  let overlay = null;

  const createSVG = () => {
    const size = 80;
    const color = '#3498db';
    return `
            <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
                <style>
                    .bounce-dot {
                        fill: ${color};
                        animation: bounce 1s infinite ease-in-out;
                        transform-origin: center;
                    }
                    .dot1 { animation-delay: -0.32s; }
                    .dot2 { animation-delay: -0.16s; }
                    
                    @keyframes bounce {
                        0%, 80%, 100% { transform: scale(0); }
                        40% { transform: scale(1); }
                    }
                </style>
                <circle class="bounce-dot dot1" cx="30" cy="40" r="12" />
                <circle class="bounce-dot dot2" cx="60" cy="40" r="12" />
                <circle class="bounce-dot dot3" cx="90" cy="40" r="12" />
            </svg>
        `;
  };

  const createStyles = () => {
    const style = document.createElement('style');
    style.id = 'loading-indicator-styles';
    style.textContent = `
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                backdrop-filter: blur(3px);
            }
            .loading-content {
                background: white;
                border-radius: 16px;
                padding: 30px 40px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                text-align: center;
            }
            .loading-text {
                margin-top: 15px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 18px;
                font-weight: 500;
                color: #333;
            }
        `;
    document.head.appendChild(style);
  };

  return {
    show: (text = 'Loading...') => {
      // Remove existing indicator if present
      if (overlay) LoadingIndicator.hide();

      // Create overlay
      overlay = document.createElement('div');
      overlay.className = 'loading-overlay';

      // Create content container
      const content = document.createElement('div');
      content.className = 'loading-content';

      // Add SVG
      content.innerHTML = createSVG();

      // Add text
      const textElement = document.createElement('div');
      textElement.className = 'loading-text';
      textElement.textContent = text;
      content.appendChild(textElement);

      // Add to DOM
      overlay.appendChild(content);
      document.body.appendChild(overlay);

      // Add styles
      if (!document.getElementById('loading-indicator-styles')) {
        createStyles();
      }

      // Prevent scrolling
      document.body.style.overflow = 'hidden';
    },

    hide: () => {
      if (overlay) {
        document.body.removeChild(overlay);
        overlay = null;

        // Restore scrolling
        document.body.style.overflow = '';

        // Remove styles if no other indicators exist
        if (!document.querySelector('.loading-overlay')) {
          const styles = document.getElementById('loading-indicator-styles');
          if (styles) document.head.removeChild(styles);
        }
      }
    }
  };
})();

