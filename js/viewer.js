// Initialize Pannellum Viewer with multiple scenes
document.addEventListener("DOMContentLoaded", () => {
    // Determine which scene to load initially (from URL params)
    const urlParams = new URLSearchParams(window.location.search);
    const initialScene = urlParams.get('scene') || 'main';
    
    let viewer;

    // Example scenes data
    const scenesConfig = {
        default: {
            firstScene: initialScene,
            sceneFadeDuration: 1000,
            autoLoad: true,
            compass: true,
            showFullscreenCtrl: true,
        },
        scenes: {
            main: {
                title: "Main Campus Entrance",
                type: "equirectangular",
                panorama: "https://pannellum.org/images/alma.jpg", // Placeholder 360 image
                hotSpots: [
                    {
                        pitch: 5,
                        yaw: 110,
                        type: "scene",
                        text: "Enter Engineering Block",
                        sceneId: "engineering",
                        cssClass: "custom-hotspot",
                        createTooltipFunc: createCustomArrowTooltip,
                        createTooltipArgs: "Enter Engineering Block"
                    },
                    {
                        pitch: -10,
                        yaw: 30,
                        type: "info",
                        text: "Statue of Founder",
                        cssClass: "custom-hotspot info-icon",
                        createTooltipFunc: createCustomInfoTooltip,
                        createTooltipArgs: {
                            title: "Founder's Memorial",
                            desc: "Erected in 1950, this statue honors the visionary founder of our university.",
                            img: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80"
                        }
                    }
                ]
            },
            engineering: {
                title: "Engineering Block - Robotics Lab",
                type: "equirectangular",
                panorama: "https://pannellum.org/images/cerro-toco-0.jpg",
                hotSpots: [
                    {
                        pitch: -5,
                        yaw: -150,
                        type: "scene",
                        text: "Back to Main Campus",
                        sceneId: "main",
                        cssClass: "custom-hotspot",
                        createTooltipFunc: createCustomArrowTooltip,
                        createTooltipArgs: "Back to Main Campus"
                    },
                    {
                        pitch: 10,
                        yaw: -50,
                        type: "info",
                        text: "CNC Machine",
                        cssClass: "custom-hotspot info-icon",
                        createTooltipFunc: createCustomInfoTooltip,
                        createTooltipArgs: {
                            title: "5-Axis CNC Machine",
                            desc: "State-of-the-art milling machine used by mechanical engineering students for precision manufacturing."
                        }
                    }
                ]
            },
            medical: {
                title: "Medical Sciences - Anatomy Lab",
                type: "equirectangular",
                panorama: "https://pannellum.org/images/bma-1.jpg",
                hotSpots: [
                    {
                        pitch: 0,
                        yaw: 180,
                        type: "scene",
                        text: "Back to Main Campus",
                        sceneId: "main",
                        cssClass: "custom-hotspot",
                        createTooltipFunc: createCustomArrowTooltip,
                        createTooltipArgs: "Back to Main Campus"
                    }
                ]
            }
        }
    };

    // Initialize viewer
    viewer = pannellum.viewer('panorama', scenesConfig);

    // Hide loading overlay when initial panorama loads
    viewer.on('load', () => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);
        }
        updateSceneTitle();
    });

    viewer.on('scenechange', () => {
        updateSceneTitle();
    });

    function updateSceneTitle() {
        const sceneId = viewer.getScene();
        const titleEl = document.getElementById('current-scene-title');
        if (titleEl && scenesConfig.scenes[sceneId]) {
            titleEl.textContent = scenesConfig.scenes[sceneId].title;
        }
    }

    // Custom Tooltip Functions
    function createCustomArrowTooltip(hotSpotDiv, args) {
        hotSpotDiv.classList.add('custom-tooltip');
        
        // Add fontawesome icon to hotspot div
        hotSpotDiv.innerHTML = '<i class="fas fa-arrow-up"></i>';
        
        // Create popup span
        var span = document.createElement('span');
        span.innerHTML = `<span class="hotspot-title">Go to:</span><span class="hotspot-desc">${args || "Next Area"}</span>`;
        hotSpotDiv.appendChild(span);
    }

    function createCustomInfoTooltip(hotSpotDiv, args) {
        hotSpotDiv.classList.add('custom-tooltip');
        hotSpotDiv.classList.add('info-icon');
        
        // Add info icon
        hotSpotDiv.innerHTML = '<i class="fas fa-info"></i>';
        
        // Create popup span
        var span = document.createElement('span');
        let html = `<span class="hotspot-title">${args.title}</span>`;
        if (args.desc) {
            html += `<span class="hotspot-desc">${args.desc}</span>`;
        }
        if (args.img) {
            html += `<img class="hotspot-img" src="${args.img}" alt="${args.title}">`;
        }
        
        span.innerHTML = html;
        hotSpotDiv.appendChild(span);
    }
});
