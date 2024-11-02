class ColorPicker extends HTMLElement {
    static instances = []; // Static property to keep track of all instances

    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        const colorId = this.getAttribute("color-id") || "1"; // Default to color ID "1"
        const hexValue = this.rgbToHex(colours[colorId]); // Convert color ID to hex
        this.value = hexValue || "#ffffff";
        this.pickerId = colorId;
        this.selectedColor = this.value; // Initialize selectedColor with the initial value

        this.shadowRoot.innerHTML = `
            <style>
                .color-picker-container {
                    display: inline-block;
                    position: relative;
                }
                .color-picker-button {
                    padding: 10px;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    border: 1px solid #ccc;
                    border-radius: 5px;
                }
                .color-preview {
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    margin-left: 8px;
                    background-color: ${this.value};
                    border-radius: 4px;
                }
                .color-picker-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: none;
                    align-items: center;
                    justify-content: center;
                    z-index: 99; /* Ensure it sits above other content */
                }
                .color-picker-popup {
                    background-color: #fff;
                    border: 1px solid #ccc;
                    padding: 10px;
                    border-radius: 8px;
                    z-index: 100;
                    display: grid;
                    grid-template-columns: repeat(30, 40px);
                    gap: 8px;
                    max-width: calc(100vw - 40px); /* Responsive width with padding */
                    max-height: calc(100vh - 40px); /* Responsive height with padding */
                    overflow: auto; /* Allow scrolling if content overflows */
                }
                .color-picker-popup div {
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    color: #fff;
                    cursor: pointer;
                    border-radius: 4px;
                }
                .close-button {
                    cursor: pointer;
                    padding: 5px;
                    background: #e74c3c;
                    color: #fff;
                    border: none;
                    border-radius: 4px;
                    margin-bottom: 10px;
                }
            </style>
            <div class="color-picker-container">
                <button class="color-picker-button">
                    <span class="color-label">Selected Color: ${this.pickerId}</span>
                    <span class="color-preview" style="background-color: ${this.value};"></span>
                </button>
                <div class="color-picker-overlay">
                    <div class="color-picker-popup">
                        <button class="close-button">Close</button>
                    </div>
                </div>
            </div>
        `;

        this.popup = this.shadowRoot.querySelector(".color-picker-popup");
        this.overlay = this.shadowRoot.querySelector(".color-picker-overlay");
        this.button = this.shadowRoot.querySelector(".color-picker-button");
        this.colorLabel = this.shadowRoot.querySelector(".color-label");
        this.colorPreview = this.shadowRoot.querySelector(".color-preview");

        this.populateColorSquares();

        // Add the instance to the static array
        ColorPicker.instances.push(this);

        this.button.addEventListener("click", (event) => this.togglePopup(event));
        this.overlay.querySelector(".close-button").addEventListener("click", () => this.closePopup());
        this.overlay.addEventListener("click", () => this.closePopup()); // Close when clicking overlay
        this.popup.addEventListener("click", (event) => event.stopPropagation()); // Prevent closing when clicking inside the popup
    }

    rgbToHex({ r, g, b }) {
        return (
            "#" +
            ((1 << 24) + (r << 16) + (g << 8) + b)
                .toString(16)
                .slice(1)
                .toUpperCase()
        );
    }

    populateColorSquares() {
        this.popup.innerHTML = ""; // Clear existing squares
        const closeButton = document.createElement("button");
        closeButton.className = "close-button";
        closeButton.textContent = "Close";
        this.popup.appendChild(closeButton); // Add close button to the popup

        Object.entries(colours).forEach(([id, color]) => {
            const hexColor = this.rgbToHex(color);
            const square = document.createElement("div");
            square.style.backgroundColor = hexColor;
            square.textContent = id;
            square.dataset.colorId = id;
            square.dataset.hexColor = hexColor;

            // Add click event to select the color
            square.addEventListener("click", (event) => this.selectColor(event));

            this.popup.appendChild(square);
        });
    }

    togglePopup(event) {
        event.stopPropagation();
        ColorPicker.closeAllInstances(); // Close all other instances

        this.overlay.style.display = this.overlay.style.display === 'flex' ? 'none' : 'flex';
    }

    closePopup() {
        this.overlay.style.display = 'none';
    }

    setValue(hexValue) {
        const colorId = Object.keys(colours).find(key => this.rgbToHex(colours[key]) === hexValue);
        if (colorId) {
            // Update the selected color and reflect it immediately
            this.value = hexValue;
            this.selectedColor = hexValue;
            this.colorLabel.textContent = `Selected Color: ${colorId}`;
            this.colorPreview.style.backgroundColor = hexValue;

            // Trigger the "change" event with the new color value
            this.dispatchEvent(new CustomEvent("change", { detail: { value: this.value } }));
        }
    }


    selectColor(event) {
        const { colorId, hexColor } = event.target.dataset;
        if (colorId) {
            // Update the selected color and reflect it immediately
            this.value = hexColor;
            this.selectedColor = hexColor;
            this.colorLabel.textContent = `Selected Color: ${colorId}`;
            this.colorPreview.style.backgroundColor = hexColor;

            // Trigger the "change" event with the new color value
            this.dispatchEvent(new CustomEvent("change", { detail: { value: this.value } }));

            // Hide the popup
            this.closePopup();
        }
    }

    // Static method to close all instances
    static closeAllInstances() {
        ColorPicker.instances.forEach(instance => {
            if (instance.overlay.style.display === 'flex') {
                instance.closePopup();
            }
        });
    }

    connectedCallback() {
        document.addEventListener("click", (event) => {
            if (!this.contains(event.target) && this.overlay.style.display === 'flex') {
                this.closePopup();
            }
        });
    }

    disconnectedCallback() {
        // Remove the instance from the static array when it is removed from the DOM
        ColorPicker.instances = ColorPicker.instances.filter(instance => instance !== this);
    }
}

customElements.define("color-picker", ColorPicker);
