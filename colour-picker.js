class ColorPicker extends HTMLElement {
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
            .color-picker-button span.color-preview {
                display: inline-block;
                width: 20px;
                height: 20px;
                margin-left: 8px;
                background-color: ${this.value};
                border-radius: 4px;
            }
            .color-picker-popup {
                position: absolute;
                top: 40px;
                left: 0;
                display: grid;
                grid-template-columns: repeat(25, 40px);
                gap: 8px;
                background-color: #fff;
                border: 1px solid #ccc;
                padding: 10px;
                border-radius: 8px;
                z-index: 100;
                display: none;
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
            </style>
            <div class="color-picker-container">
                <button class="color-picker-button">
                    <span class="color-label">Selected Color: ${this.pickerId}</span>
                    <span class="color-preview" style="background-color: ${this.value};"></span>
                </button>
                <div class="color-picker-popup"></div>
            </div>
        `;

        this.popup = this.shadowRoot.querySelector(".color-picker-popup");
        this.button = this.shadowRoot.querySelector(".color-picker-button");
        this.colorLabel = this.shadowRoot.querySelector(".color-label");
        this.colorPreview = this.shadowRoot.querySelector(".color-preview");

        this.populateColorSquares();

        this.button.addEventListener("click", (event) => this.togglePopup(event));
        this.popup.addEventListener("click", (event) => this.selectColor(event));
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
        this.popup.innerHTML = "";
        Object.entries(colours).forEach(([id, color]) => {
            const hexColor = this.rgbToHex(color);
            const square = document.createElement("div");
            square.style.backgroundColor = hexColor;
            square.textContent = id;
            square.dataset.colorId = id;
            square.dataset.hexColor = hexColor;
            this.popup.appendChild(square);
        });
    }

    togglePopup(event) {
        event.stopPropagation();
        this.popup.style.display = this.popup.style.display === 'grid' ? 'none' : 'grid';
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
            this.popup.style.display = 'none';
        }
    }

    connectedCallback() {
        document.addEventListener("click", (event) => {
            if (!this.contains(event.target)) {
                this.popup.style.display = 'none';
            }
        });
    }
}

customElements.define("color-picker", ColorPicker);
