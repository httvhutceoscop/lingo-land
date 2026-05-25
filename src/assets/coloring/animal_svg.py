"""
Module render SVG hình ảnh các con vật.
Mỗi con vật được tạo từ nhiều <path> riêng biệt (mỗi vùng = 1 path có class riêng)
để có thể fill màu độc lập qua CSS hoặc thuộc tính fill.
"""

from typing import Dict, Optional


# ---------------------------------------------------------------------------
# Bảng màu mặc định cho từng vùng của từng con vật.
# Key là "class" của path trong SVG, value là màu fill mặc định.
# ---------------------------------------------------------------------------
DEFAULT_PALETTES: Dict[str, Dict[str, str]] = {
    "cat": {
        "body":       "#F4B860",
        "belly":      "#FFE3B8",
        "head":       "#F4B860",
        "ear-left":   "#F4B860",
        "ear-right":  "#F4B860",
        "ear-inner-left":  "#E68A8A",
        "ear-inner-right": "#E68A8A",
        "tail":       "#F4B860",
        "leg-front":  "#F4B860",
        "leg-back":   "#F4B860",
        "eye-left":   "#1E1E1E",
        "eye-right":  "#1E1E1E",
        "nose":       "#E68A8A",
        "mouth":      "#1E1E1E",
        "whisker":    "#1E1E1E",
    },
    "dog": {
        "body":       "#C58B5C",
        "belly":      "#F3D8B8",
        "head":       "#C58B5C",
        "ear-left":   "#7A4A2B",
        "ear-right":  "#7A4A2B",
        "tail":       "#C58B5C",
        "leg-front":  "#C58B5C",
        "leg-back":   "#C58B5C",
        "snout":      "#F3D8B8",
        "eye-left":   "#1E1E1E",
        "eye-right":  "#1E1E1E",
        "nose":       "#1E1E1E",
        "mouth":      "#1E1E1E",
        "tongue":     "#E86A6A",
    },
    "pig": {
        "body":       "#F5B6C2",
        "belly":      "#FBD9DF",
        "head":       "#F5B6C2",
        "ear-left":   "#E89AAA",
        "ear-right":  "#E89AAA",
        "snout":      "#E89AAA",
        "nostril-left":  "#9C5666",
        "nostril-right": "#9C5666",
        "tail":       "#F5B6C2",
        "leg-front":  "#E89AAA",
        "leg-back":   "#E89AAA",
        "eye-left":   "#1E1E1E",
        "eye-right":  "#1E1E1E",
        "mouth":      "#9C5666",
    },
    "cow": {
        "body":       "#FFFFFF",
        "belly":      "#FFF3DC",
        "head":       "#FFFFFF",
        "spot-1":     "#2B2B2B",
        "spot-2":     "#2B2B2B",
        "spot-3":     "#2B2B2B",
        "ear-left":   "#FFFFFF",
        "ear-right":  "#FFFFFF",
        "horn-left":  "#E6D6A8",
        "horn-right": "#E6D6A8",
        "snout":      "#F4C8C0",
        "udder":      "#F4C8C0",
        "tail":       "#FFFFFF",
        "tail-tip":   "#2B2B2B",
        "leg-front":  "#FFFFFF",
        "leg-back":   "#FFFFFF",
        "hoof-front": "#2B2B2B",
        "hoof-back":  "#2B2B2B",
        "eye-left":   "#1E1E1E",
        "eye-right":  "#1E1E1E",
        "nostril-left":  "#9C5666",
        "nostril-right": "#9C5666",
    },
    "rabbit": {
        "body":       "#E8E8E8",
        "belly":      "#FFFFFF",
        "head":       "#E8E8E8",
        "ear-left":   "#E8E8E8",
        "ear-right":  "#E8E8E8",
        "ear-inner-left":  "#F5BFCB",
        "ear-inner-right": "#F5BFCB",
        "tail":       "#FFFFFF",
        "leg-front":  "#E8E8E8",
        "leg-back":   "#E8E8E8",
        "eye-left":   "#1E1E1E",
        "eye-right":  "#1E1E1E",
        "nose":       "#F5BFCB",
        "mouth":      "#1E1E1E",
    },
    "fish": {
        "body":       "#5BB8E0",
        "belly":      "#BFE6F5",
        "fin-top":    "#3F95BD",
        "fin-bottom": "#3F95BD",
        "tail":       "#3F95BD",
        "eye":        "#1E1E1E",
        "eye-white":  "#FFFFFF",
        "gill":       "#3F95BD",
        "mouth":      "#1E1E1E",
    },
    "bird": {
        "body":       "#F2C94C",
        "belly":      "#FFE9A8",
        "head":       "#F2C94C",
        "wing":       "#D9A93A",
        "tail":       "#D9A93A",
        "beak":       "#E86A2C",
        "leg-left":   "#E86A2C",
        "leg-right":  "#E86A2C",
        "eye":        "#1E1E1E",
        "eye-white":  "#FFFFFF",
    },
    "lion": {
        "body":       "#E0A867",
        "belly":      "#F5D9A8",
        "head":       "#E8B673",
        "mane":       "#9C5A1F",
        "ear-left":   "#9C5A1F",
        "ear-right":  "#9C5A1F",
        "snout":      "#F5D9A8",
        "tail":       "#E0A867",
        "tail-tuft":  "#9C5A1F",
        "leg-front":  "#E0A867",
        "leg-back":   "#E0A867",
        "eye-left":   "#1E1E1E",
        "eye-right":  "#1E1E1E",
        "nose":       "#4A2810",
        "mouth":      "#1E1E1E",
    },
    "tiger": {
        "body":       "#F09836",
        "belly":      "#FFE3B8",
        "head":       "#F09836",
        "ear-left":   "#F09836",
        "ear-right":  "#F09836",
        "ear-inner":  "#FFFFFF",
        "snout":      "#FFE3B8",
        "tail":       "#F09836",
        "leg-front":  "#F09836",
        "leg-back":   "#F09836",
        "stripe-body": "#2B2B2B",
        "stripe-head": "#2B2B2B",
        "stripe-tail": "#2B2B2B",
        "eye-left":   "#2B7A1F",
        "eye-right":  "#2B7A1F",
        "nose":       "#2B2B2B",
        "mouth":      "#1E1E1E",
    },
    "elephant": {
        "body":       "#A8A8B0",
        "belly":      "#C0C0C8",
        "head":       "#A8A8B0",
        "ear":        "#8E8E96",
        "trunk":      "#A8A8B0",
        "tusk":       "#F5EDD4",
        "tail":       "#A8A8B0",
        "tail-tip":   "#5F5F66",
        "leg-front":  "#A8A8B0",
        "leg-back":   "#A8A8B0",
        "toenail":    "#5F5F66",
        "eye":        "#1E1E1E",
    },
    "bear": {
        "body":       "#7A4A2B",
        "belly":      "#A8784E",
        "head":       "#7A4A2B",
        "ear-left":   "#7A4A2B",
        "ear-right":  "#7A4A2B",
        "ear-inner-left":  "#A8784E",
        "ear-inner-right": "#A8784E",
        "snout":      "#C9A57A",
        "leg-front":  "#7A4A2B",
        "leg-back":   "#7A4A2B",
        "paw-pad":    "#3E2410",
        "eye-left":   "#1E1E1E",
        "eye-right":  "#1E1E1E",
        "nose":       "#1E1E1E",
        "mouth":      "#1E1E1E",
    },
    "giraffe": {
        "body":       "#F2D08C",
        "belly":      "#FFE9B8",
        "head":       "#F2D08C",
        "neck":       "#F2D08C",
        "snout":      "#FFE9B8",
        "spot":       "#8B5A2B",
        "spot-neck":  "#8B5A2B",
        "mane":       "#6B3F1A",
        "tail":       "#F2D08C",
        "tail-tuft":  "#6B3F1A",
        "leg-front":  "#F2D08C",
        "leg-back":   "#F2D08C",
        "hoof":       "#3E2410",
        "horn":       "#F2D08C",
        "horn-tip":   "#1E1E1E",
        "ear":        "#F2D08C",
        "eye":        "#1E1E1E",
    },
    "zebra": {
        "body":       "#FFFFFF",
        "belly":      "#F5F5F5",
        "head":       "#FFFFFF",
        "neck":       "#FFFFFF",
        "stripe":     "#1E1E1E",
        "stripe-head": "#1E1E1E",
        "stripe-neck": "#1E1E1E",
        "mane":       "#1E1E1E",
        "tail":       "#FFFFFF",
        "tail-tuft":  "#1E1E1E",
        "leg-front":  "#FFFFFF",
        "leg-back":   "#FFFFFF",
        "hoof":       "#1E1E1E",
        "ear":        "#FFFFFF",
        "eye":        "#1E1E1E",
        "nostril":    "#1E1E1E",
    },
    "monkey": {
        "body":       "#8B5A3C",
        "belly":      "#D4A878",
        "head":       "#8B5A3C",
        "face":       "#E8C49A",
        "ear-left":   "#8B5A3C",
        "ear-right":  "#8B5A3C",
        "ear-inner-left":  "#E8C49A",
        "ear-inner-right": "#E8C49A",
        "arm-left":   "#8B5A3C",
        "arm-right":  "#8B5A3C",
        "hand":       "#D4A878",
        "leg-back":   "#8B5A3C",
        "foot":       "#D4A878",
        "tail":       "#8B5A3C",
        "brow":       "#5F3820",
        "eye-left":   "#1E1E1E",
        "eye-right":  "#1E1E1E",
        "nose":       "#5F3820",
        "mouth":      "#5F3820",
    },
    "fox": {
        "body":       "#E0631A",
        "belly":      "#FFFFFF",
        "head":       "#E0631A",
        "snout":      "#FFFFFF",
        "cheek":      "#FFFFFF",
        "ear-left":   "#E0631A",
        "ear-right":  "#E0631A",
        "ear-inner-left":  "#1E1E1E",
        "ear-inner-right": "#1E1E1E",
        "tail":       "#E0631A",
        "tail-tip":   "#FFFFFF",
        "leg-front":  "#E0631A",
        "leg-back":   "#E0631A",
        "sock":       "#1E1E1E",
        "eye-left":   "#1E1E1E",
        "eye-right":  "#1E1E1E",
        "nose":       "#1E1E1E",
        "mouth":      "#1E1E1E",
    },
    "panda": {
        "body":       "#FFFFFF",
        "belly":      "#F5F5F5",
        "head":       "#FFFFFF",
        "shoulder-band":  "#1E1E1E",
        "ear-left":   "#1E1E1E",
        "ear-right":  "#1E1E1E",
        "eye-patch-left":  "#1E1E1E",
        "eye-patch-right": "#1E1E1E",
        "leg-front":  "#1E1E1E",
        "leg-back":   "#1E1E1E",
        "snout":      "#FFFFFF",
        "nose":       "#1E1E1E",
        "eye-left":   "#FFFFFF",
        "eye-right":  "#FFFFFF",
        "mouth":      "#1E1E1E",
    },
    "hippo": {
        "body":       "#A88BA0",
        "belly":      "#C5A8BC",
        "head":       "#A88BA0",
        "snout":      "#9C7E94",
        "ear-left":   "#A88BA0",
        "ear-right":  "#A88BA0",
        "ear-inner-left":  "#E89AAA",
        "ear-inner-right": "#E89AAA",
        "tail":       "#A88BA0",
        "leg-front":  "#A88BA0",
        "leg-back":   "#A88BA0",
        "toe":        "#5F4858",
        "eye-bump-left":  "#A88BA0",
        "eye-bump-right": "#A88BA0",
        "eye-left":   "#1E1E1E",
        "eye-right":  "#1E1E1E",
        "nostril":    "#5F4858",
        "mouth":      "#5F4858",
        "tooth":      "#FFFFFF",
    },
    "rhino": {
        "body":       "#8E8E96",
        "belly":      "#A8A8B0",
        "head":       "#8E8E96",
        "horn-big":   "#D4CFC0",
        "horn-small": "#D4CFC0",
        "ear-left":   "#8E8E96",
        "ear-right":  "#8E8E96",
        "tail":       "#8E8E96",
        "tail-tuft":  "#3E3E44",
        "leg-front":  "#8E8E96",
        "leg-back":   "#8E8E96",
        "toenail":    "#3E3E44",
        "skin-fold":  "#5F5F66",
        "eye":        "#1E1E1E",
        "nostril":    "#3E3E44",
        "mouth":      "#3E3E44",
    },
    "wolf": {
        "body":       "#7A7E85",
        "belly":      "#D4D2CC",
        "head":       "#7A7E85",
        "back-stripe": "#3E3E44",
        "snout":      "#D4D2CC",
        "cheek":      "#D4D2CC",
        "ruff":       "#5F5F66",
        "ear-left":   "#7A7E85",
        "ear-right":  "#7A7E85",
        "ear-inner-left":  "#3E3E44",
        "ear-inner-right": "#3E3E44",
        "tail":       "#7A7E85",
        "tail-tip":   "#3E3E44",
        "leg-front":  "#7A7E85",
        "leg-back":   "#7A7E85",
        "eye-left":   "#E8B445",
        "eye-right":  "#E8B445",
        "nose":       "#1E1E1E",
        "mouth":      "#1E1E1E",
    },
    "kangaroo": {
        "body":       "#B8865C",
        "belly":      "#E8C49A",
        "head":       "#B8865C",
        "neck":       "#B8865C",
        "snout":      "#9C6E48",
        "pouch":      "#E8C49A",
        "ear-left":   "#B8865C",
        "ear-right":  "#B8865C",
        "ear-inner-left":  "#E8C49A",
        "ear-inner-right": "#E8C49A",
        "arm-left":   "#B8865C",
        "arm-right":  "#B8865C",
        "paw":        "#9C6E48",
        "leg-back":   "#B8865C",
        "foot":       "#9C6E48",
        "tail":       "#B8865C",
        "eye-left":   "#1E1E1E",
        "eye-right":  "#1E1E1E",
        "nose":       "#1E1E1E",
        "mouth":      "#1E1E1E",
    },
    "snake": {
        "body":       "#5BA84A",
        "belly":      "#D4E8A8",
        "head":       "#5BA84A",
        "pattern":    "#2B5F1F",
        "tail-tip":   "#2B5F1F",
        "eye-bump":   "#5BA84A",
        "eye":        "#E8B445",
        "nostril":    "#2B5F1F",
        "tongue":     "#E24B4A",
    },
    "eagle": {
        "body":       "#5F3820",
        "belly":      "#7A4A2B",
        "head":       "#FFFFFF",
        "neck":       "#FFFFFF",
        "wing":       "#3E2410",
        "wing-feather": "#1E1E1E",
        "tail":       "#FFFFFF",
        "tail-line":  "#888880",
        "beak-top":   "#E8B445",
        "beak-bottom": "#E8B445",
        "brow":       "#3E2410",
        "leg-left":   "#E8B445",
        "leg-right":  "#E8B445",
        "talon":      "#1E1E1E",
        "eye":        "#1E1E1E",
        "eye-white":  "#F5EDD4",
    },
    "crocodile": {
        "body":       "#5F7A3E",
        "belly":      "#C5C094",
        "head":       "#5F7A3E",
        "scale":      "#3E5028",
        "tail":       "#5F7A3E",
        "leg-front":  "#5F7A3E",
        "leg-back":   "#5F7A3E",
        "claw":       "#1E1E1E",
        "jaw-line":   "#3E5028",
        "tooth":      "#FFFFFF",
        "eye-bump":   "#5F7A3E",
        "eye":        "#E8B445",
        "nostril":    "#3E5028",
    },
}


# ---------------------------------------------------------------------------
# Định nghĩa hình dạng (geometry) của từng con vật.
# Mỗi vùng là một <path> riêng có class để dễ tô màu/style.
# Tất cả vẽ trong viewBox 0 0 200 200.
# ---------------------------------------------------------------------------
ANIMAL_SHAPES: Dict[str, str] = {
    # ---------------------------- CAT ----------------------------
    "cat": """
    <!-- Tail -->
    <path class="tail" d="M40,140 Q15,120 25,90 Q30,80 40,85 Q35,105 50,130 Z"/>
    <!-- Back legs -->
    <path class="leg-back" d="M55,160 q5,15 0,25 h15 q-2,-15 -2,-25 Z"/>
    <path class="leg-back" d="M135,160 q5,15 0,25 h15 q-2,-15 -2,-25 Z"/>
    <!-- Body -->
    <ellipse class="body" cx="100" cy="135" rx="55" ry="35"/>
    <!-- Belly -->
    <ellipse class="belly" cx="100" cy="150" rx="35" ry="18"/>
    <!-- Front legs -->
    <path class="leg-front" d="M75,160 q-3,15 0,22 h14 q-1,-12 0,-22 Z"/>
    <path class="leg-front" d="M115,160 q-3,15 0,22 h14 q-1,-12 0,-22 Z"/>
    <!-- Head -->
    <circle class="head" cx="100" cy="75" r="38"/>
    <!-- Ears outer -->
    <path class="ear-left"  d="M68,55 L62,20 L92,45 Z"/>
    <path class="ear-right" d="M132,55 L138,20 L108,45 Z"/>
    <!-- Ears inner -->
    <path class="ear-inner-left"  d="M72,48 L70,30 L86,46 Z"/>
    <path class="ear-inner-right" d="M128,48 L130,30 L114,46 Z"/>
    <!-- Eyes -->
    <ellipse class="eye-left"  cx="85"  cy="72" rx="4" ry="6"/>
    <ellipse class="eye-right" cx="115" cy="72" rx="4" ry="6"/>
    <!-- Nose -->
    <path class="nose" d="M95,85 L105,85 L100,92 Z"/>
    <!-- Mouth -->
    <path class="mouth" d="M100,92 Q95,98 90,95 M100,92 Q105,98 110,95"
          fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Whiskers -->
    <path class="whisker" d="M75,88 L60,85 M75,92 L60,94 M125,88 L140,85 M125,92 L140,94"
          fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
    """,

    # ---------------------------- DOG ----------------------------
    "dog": """
    <!-- Tail -->
    <path class="tail" d="M155,130 Q180,115 178,95 Q172,92 170,108 Q160,118 150,125 Z"/>
    <!-- Back legs -->
    <path class="leg-back" d="M55,160 q3,18 0,26 h16 q0,-15 -2,-26 Z"/>
    <path class="leg-back" d="M140,160 q3,18 0,26 h16 q0,-15 -2,-26 Z"/>
    <!-- Body -->
    <ellipse class="body" cx="100" cy="135" rx="55" ry="32"/>
    <!-- Belly -->
    <ellipse class="belly" cx="100" cy="148" rx="35" ry="15"/>
    <!-- Front legs -->
    <path class="leg-front" d="M75,160 q-2,15 0,22 h14 q0,-12 0,-22 Z"/>
    <path class="leg-front" d="M115,160 q-2,15 0,22 h14 q0,-12 0,-22 Z"/>
    <!-- Head -->
    <ellipse class="head" cx="100" cy="78" rx="40" ry="36"/>
    <!-- Floppy ears -->
    <path class="ear-left"  d="M65,55 Q50,85 60,100 Q72,98 75,80 Q70,68 65,55 Z"/>
    <path class="ear-right" d="M135,55 Q150,85 140,100 Q128,98 125,80 Q130,68 135,55 Z"/>
    <!-- Snout -->
    <ellipse class="snout" cx="100" cy="92" rx="20" ry="14"/>
    <!-- Eyes -->
    <circle class="eye-left"  cx="88"  cy="72" r="4"/>
    <circle class="eye-right" cx="112" cy="72" r="4"/>
    <!-- Nose -->
    <ellipse class="nose" cx="100" cy="86" rx="5" ry="4"/>
    <!-- Mouth -->
    <path class="mouth" d="M100,90 L100,98 Q95,103 90,100 M100,98 Q105,103 110,100"
          fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Tongue -->
    <path class="tongue" d="M96,100 Q100,108 104,100 Z"/>
    """,

    # ---------------------------- PIG ----------------------------
    "pig": """
    <!-- Curly tail -->
    <path class="tail" d="M155,125 q12,-2 12,-12 q0,-8 -8,-6 q-4,1 -3,6"
          fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    <!-- Back legs -->
    <path class="leg-back" d="M55,160 q2,15 0,25 h15 q0,-13 0,-25 Z"/>
    <path class="leg-back" d="M140,160 q2,15 0,25 h15 q0,-13 0,-25 Z"/>
    <!-- Body -->
    <ellipse class="body" cx="100" cy="130" rx="55" ry="35"/>
    <!-- Belly -->
    <ellipse class="belly" cx="100" cy="148" rx="32" ry="15"/>
    <!-- Front legs -->
    <path class="leg-front" d="M75,160 q-2,15 0,22 h14 q0,-12 0,-22 Z"/>
    <path class="leg-front" d="M115,160 q-2,15 0,22 h14 q0,-12 0,-22 Z"/>
    <!-- Head -->
    <ellipse class="head" cx="100" cy="78" rx="38" ry="34"/>
    <!-- Ears (triangle floppy) -->
    <path class="ear-left"  d="M70,50 L62,30 L88,48 Z"/>
    <path class="ear-right" d="M130,50 L138,30 L112,48 Z"/>
    <!-- Snout -->
    <ellipse class="snout" cx="100" cy="90" rx="18" ry="12"/>
    <!-- Nostrils -->
    <ellipse class="nostril-left"  cx="93"  cy="90" rx="2.5" ry="3.5"/>
    <ellipse class="nostril-right" cx="107" cy="90" rx="2.5" ry="3.5"/>
    <!-- Eyes -->
    <circle class="eye-left"  cx="88"  cy="72" r="3"/>
    <circle class="eye-right" cx="112" cy="72" r="3"/>
    <!-- Mouth -->
    <path class="mouth" d="M90,100 Q100,106 110,100"
          fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    """,

    # ---------------------------- COW ----------------------------
    "cow": """
    <!-- Tail -->
    <path class="tail" d="M155,135 q22,5 22,30" fill="none" stroke="currentColor" stroke-width="3"/>
    <path class="tail-tip" d="M174,160 q4,4 0,10 q-6,-2 -4,-10 Z"/>
    <!-- Back legs -->
    <path class="leg-back" d="M55,160 q2,18 0,26 h14 q0,-15 0,-26 Z"/>
    <path class="leg-back" d="M140,160 q2,18 0,26 h14 q0,-15 0,-26 Z"/>
    <rect class="hoof-back" x="55" y="182" width="14" height="5"/>
    <rect class="hoof-back" x="140" y="182" width="14" height="5"/>
    <!-- Body -->
    <ellipse class="body" cx="100" cy="130" rx="58" ry="33"/>
    <!-- Belly -->
    <ellipse class="belly" cx="100" cy="148" rx="35" ry="14"/>
    <!-- Udder -->
    <ellipse class="udder" cx="100" cy="160" rx="10" ry="6"/>
    <!-- Spots -->
    <ellipse class="spot-1" cx="75"  cy="120" rx="12" ry="9"/>
    <ellipse class="spot-2" cx="125" cy="135" rx="14" ry="10"/>
    <ellipse class="spot-3" cx="105" cy="115" rx="9"  ry="6"/>
    <!-- Front legs -->
    <path class="leg-front" d="M75,160 q-2,15 0,22 h14 q0,-12 0,-22 Z"/>
    <path class="leg-front" d="M115,160 q-2,15 0,22 h14 q0,-12 0,-22 Z"/>
    <rect class="hoof-front" x="75"  y="178" width="14" height="5"/>
    <rect class="hoof-front" x="115" y="178" width="14" height="5"/>
    <!-- Head -->
    <ellipse class="head" cx="100" cy="78" rx="36" ry="34"/>
    <!-- Horns -->
    <path class="horn-left"  d="M72,52 q-8,-10 -4,-18 q6,2 10,14 Z"/>
    <path class="horn-right" d="M128,52 q8,-10 4,-18 q-6,2 -10,14 Z"/>
    <!-- Ears -->
    <ellipse class="ear-left"  cx="68"  cy="68" rx="9"  ry="6" transform="rotate(-30 68 68)"/>
    <ellipse class="ear-right" cx="132" cy="68" rx="9"  ry="6" transform="rotate(30 132 68)"/>
    <!-- Snout -->
    <ellipse class="snout" cx="100" cy="92" rx="20" ry="13"/>
    <!-- Nostrils -->
    <ellipse class="nostril-left"  cx="93"  cy="93" rx="2" ry="3"/>
    <ellipse class="nostril-right" cx="107" cy="93" rx="2" ry="3"/>
    <!-- Eyes -->
    <circle class="eye-left"  cx="88"  cy="72" r="3.5"/>
    <circle class="eye-right" cx="112" cy="72" r="3.5"/>
    """,

    # ---------------------------- RABBIT ----------------------------
    "rabbit": """
    <!-- Tail (puff) -->
    <circle class="tail" cx="40" cy="135" r="10"/>
    <!-- Back legs -->
    <ellipse class="leg-back" cx="65"  cy="170" rx="14" ry="10"/>
    <ellipse class="leg-back" cx="135" cy="170" rx="14" ry="10"/>
    <!-- Body -->
    <ellipse class="body" cx="100" cy="140" rx="45" ry="30"/>
    <!-- Belly -->
    <ellipse class="belly" cx="100" cy="152" rx="28" ry="14"/>
    <!-- Front legs -->
    <ellipse class="leg-front" cx="85"  cy="172" rx="7" ry="10"/>
    <ellipse class="leg-front" cx="115" cy="172" rx="7" ry="10"/>
    <!-- Head -->
    <circle class="head" cx="100" cy="85" r="30"/>
    <!-- Long ears -->
    <ellipse class="ear-left"  cx="86"  cy="38" rx="7" ry="25" transform="rotate(-10 86 38)"/>
    <ellipse class="ear-right" cx="114" cy="38" rx="7" ry="25" transform="rotate(10 114 38)"/>
    <!-- Inner ears -->
    <ellipse class="ear-inner-left"  cx="86"  cy="40" rx="3" ry="18" transform="rotate(-10 86 40)"/>
    <ellipse class="ear-inner-right" cx="114" cy="40" rx="3" ry="18" transform="rotate(10 114 40)"/>
    <!-- Eyes -->
    <circle class="eye-left"  cx="90"  cy="82" r="3"/>
    <circle class="eye-right" cx="110" cy="82" r="3"/>
    <!-- Nose -->
    <path class="nose" d="M97,92 L103,92 L100,96 Z"/>
    <!-- Mouth -->
    <path class="mouth" d="M100,96 L100,100 M100,100 Q96,103 93,101 M100,100 Q104,103 107,101"
          fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    """,

    # ---------------------------- FISH ----------------------------
    "fish": """
    <!-- Tail -->
    <path class="tail" d="M155,100 L185,75 L185,125 Z"/>
    <!-- Body -->
    <ellipse class="body" cx="95" cy="100" rx="65" ry="38"/>
    <!-- Belly -->
    <path class="belly" d="M40,110 Q95,140 150,110 Q95,130 40,110 Z"/>
    <!-- Top fin -->
    <path class="fin-top" d="M70,65 Q95,40 120,65 Q95,72 70,65 Z"/>
    <!-- Bottom fin -->
    <path class="fin-bottom" d="M70,135 Q95,160 120,135 Q95,128 70,135 Z"/>
    <!-- Gill -->
    <path class="gill" d="M115,85 Q108,100 115,115" fill="none" stroke="currentColor" stroke-width="2"/>
    <!-- Eye -->
    <circle class="eye-white" cx="55" cy="92" r="8"/>
    <circle class="eye"       cx="55" cy="92" r="4"/>
    <!-- Mouth -->
    <path class="mouth" d="M32,105 Q38,110 32,115" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    """,

    # ---------------------------- BIRD ----------------------------
    "bird": """
    <!-- Tail -->
    <path class="tail" d="M40,115 L15,105 L15,135 L40,130 Z"/>
    <!-- Body -->
    <ellipse class="body" cx="95" cy="115" rx="55" ry="42"/>
    <!-- Belly -->
    <ellipse class="belly" cx="95" cy="128" rx="35" ry="22"/>
    <!-- Wing -->
    <path class="wing" d="M85,100 Q120,95 130,125 Q105,140 80,130 Q75,115 85,100 Z"/>
    <!-- Head -->
    <circle class="head" cx="130" cy="80" r="28"/>
    <!-- Beak -->
    <path class="beak" d="M158,80 L175,85 L158,90 Z"/>
    <!-- Eye -->
    <circle class="eye-white" cx="138" cy="75" r="6"/>
    <circle class="eye"       cx="139" cy="75" r="3"/>
    <!-- Legs -->
    <path class="leg-left"  d="M85,155 L82,180 M82,180 L75,182 M82,180 L82,182 M82,180 L89,182"
          fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path class="leg-right" d="M110,155 L113,180 M113,180 L106,182 M113,180 L113,182 M113,180 L120,182"
          fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    """,

    # ---------------------------- LION ----------------------------
    "lion": """
    <!-- Tail -->
    <path class="tail" d="M155,135 q25,5 28,25" fill="none" stroke="currentColor" stroke-width="3"/>
    <path class="tail-tuft" d="M180,158 q6,4 4,12 q-8,-2 -8,-10 Z"/>
    <!-- Back legs -->
    <path class="leg-back" d="M55,160 q2,15 0,25 h15 q0,-13 0,-25 Z"/>
    <path class="leg-back" d="M140,160 q2,15 0,25 h15 q0,-13 0,-25 Z"/>
    <!-- Body -->
    <ellipse class="body" cx="100" cy="135" rx="55" ry="33"/>
    <!-- Belly -->
    <ellipse class="belly" cx="100" cy="150" rx="35" ry="15"/>
    <!-- Front legs -->
    <path class="leg-front" d="M75,160 q-2,15 0,22 h14 q0,-12 0,-22 Z"/>
    <path class="leg-front" d="M115,160 q-2,15 0,22 h14 q0,-12 0,-22 Z"/>
    <!-- Mane -->
    <circle class="mane" cx="100" cy="78" r="44"/>
    <path class="mane" d="M60,78 q-6,-6 -3,-14 q5,2 8,8 Z M140,78 q6,-6 3,-14 q-5,2 -8,8 Z M70,45 q-3,-7 2,-12 q6,3 5,10 Z M130,45 q3,-7 -2,-12 q-6,3 -5,10 Z M100,30 q-5,-6 0,-12 q5,6 0,12 Z"/>
    <!-- Head -->
    <circle class="head" cx="100" cy="80" r="30"/>
    <!-- Ears -->
    <circle class="ear-left"  cx="80"  cy="58" r="6"/>
    <circle class="ear-right" cx="120" cy="58" r="6"/>
    <!-- Snout -->
    <ellipse class="snout" cx="100" cy="92" rx="14" ry="10"/>
    <!-- Eyes -->
    <circle class="eye-left"  cx="90"  cy="78" r="3"/>
    <circle class="eye-right" cx="110" cy="78" r="3"/>
    <!-- Nose -->
    <path class="nose" d="M96,87 L104,87 L100,93 Z"/>
    <!-- Mouth -->
    <path class="mouth" d="M100,93 L100,99 Q96,102 93,100 M100,99 Q104,102 107,100"
          fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    """,

    # ---------------------------- TIGER ----------------------------
    "tiger": """
    <!-- Tail -->
    <path class="tail" d="M155,135 q25,0 28,-15 q-3,-3 -8,2 q-4,12 -20,8 Z"/>
    <path class="stripe-tail" d="M165,128 l3,-8 M172,124 l3,-7"
          fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Back legs -->
    <path class="leg-back" d="M55,160 q2,15 0,25 h15 q0,-13 0,-25 Z"/>
    <path class="leg-back" d="M140,160 q2,15 0,25 h15 q0,-13 0,-25 Z"/>
    <!-- Body -->
    <ellipse class="body" cx="100" cy="135" rx="55" ry="33"/>
    <!-- Belly -->
    <ellipse class="belly" cx="100" cy="150" rx="35" ry="15"/>
    <!-- Stripes on body -->
    <path class="stripe-body" d="M65,118 q5,8 0,16 M80,113 q5,9 0,18 M100,110 q5,9 0,20 M120,113 q5,9 0,18 M135,118 q5,8 0,16"
          fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    <!-- Front legs -->
    <path class="leg-front" d="M75,160 q-2,15 0,22 h14 q0,-12 0,-22 Z"/>
    <path class="leg-front" d="M115,160 q-2,15 0,22 h14 q0,-12 0,-22 Z"/>
    <!-- Head -->
    <circle class="head" cx="100" cy="75" r="36"/>
    <!-- Ears outer -->
    <path class="ear-left"  d="M70,52 L66,30 L88,46 Z"/>
    <path class="ear-right" d="M130,52 L134,30 L112,46 Z"/>
    <!-- Ears inner -->
    <path class="ear-inner" d="M73,48 L72,36 L84,46 Z M127,48 L128,36 L116,46 Z"/>
    <!-- Stripes on head -->
    <path class="stripe-head" d="M75,70 l-8,-4 M75,80 l-10,2 M125,70 l8,-4 M125,80 l10,2 M100,45 l-3,-10 M100,45 l3,-10 M90,50 l-2,-8 M110,50 l2,-8"
          fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Snout -->
    <ellipse class="snout" cx="100" cy="88" rx="16" ry="11"/>
    <!-- Eyes -->
    <ellipse class="eye-left"  cx="88"  cy="72" rx="3.5" ry="5"/>
    <ellipse class="eye-right" cx="112" cy="72" rx="3.5" ry="5"/>
    <!-- Nose -->
    <path class="nose" d="M95,82 L105,82 L100,89 Z"/>
    <!-- Mouth -->
    <path class="mouth" d="M100,89 L100,96 Q95,100 91,98 M100,96 Q105,100 109,98"
          fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    """,

    # ---------------------------- ELEPHANT ----------------------------
    "elephant": """
    <!-- Tail -->
    <path class="tail" d="M30,130 q-12,5 -10,18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    <path class="tail-tip" d="M18,148 q3,3 0,8 q-4,-2 -3,-8 Z"/>
    <!-- Back legs -->
    <rect class="leg-back" x="50" y="140" width="20" height="42" rx="3"/>
    <rect class="leg-back" x="130" y="140" width="20" height="42" rx="3"/>
    <rect class="toenail" x="52" y="178" width="16" height="4" rx="1"/>
    <rect class="toenail" x="132" y="178" width="16" height="4" rx="1"/>
    <!-- Body -->
    <ellipse class="body" cx="100" cy="120" rx="60" ry="38"/>
    <!-- Belly -->
    <ellipse class="belly" cx="100" cy="138" rx="40" ry="18"/>
    <!-- Front legs -->
    <rect class="leg-front" x="75" y="140" width="20" height="42" rx="3"/>
    <rect class="leg-front" x="105" y="140" width="20" height="42" rx="3"/>
    <rect class="toenail" x="77" y="178" width="16" height="4" rx="1"/>
    <rect class="toenail" x="107" y="178" width="16" height="4" rx="1"/>
    <!-- Head -->
    <ellipse class="head" cx="148" cy="95" rx="32" ry="30"/>
    <!-- Ear -->
    <path class="ear" d="M130,75 q-25,-5 -28,20 q-2,22 22,22 q5,-18 6,-42 Z"/>
    <!-- Trunk -->
    <path class="trunk" d="M168,105 q15,5 18,25 q1,15 -10,18 q-3,-2 0,-6 q8,-2 6,-12 q-2,-12 -14,-15 Z"/>
    <!-- Tusk -->
    <path class="tusk" d="M158,118 q3,8 -2,14 q-4,-2 -3,-12 Z"/>
    <!-- Eye -->
    <circle class="eye" cx="152" cy="90" r="3"/>
    """,

    # ---------------------------- BEAR ----------------------------
    "bear": """
    <!-- Back legs -->
    <ellipse class="leg-back" cx="62"  cy="170" rx="14" ry="14"/>
    <ellipse class="leg-back" cx="138" cy="170" rx="14" ry="14"/>
    <!-- Body -->
    <ellipse class="body" cx="100" cy="135" rx="55" ry="38"/>
    <!-- Belly -->
    <ellipse class="belly" cx="100" cy="148" rx="32" ry="20"/>
    <!-- Front legs -->
    <ellipse class="leg-front" cx="80"  cy="172" rx="11" ry="13"/>
    <ellipse class="leg-front" cx="120" cy="172" rx="11" ry="13"/>
    <!-- Paw pads -->
    <circle class="paw-pad" cx="80"  cy="180" r="4"/>
    <circle class="paw-pad" cx="120" cy="180" r="4"/>
    <!-- Head -->
    <circle class="head" cx="100" cy="78" r="35"/>
    <!-- Ears outer -->
    <circle class="ear-left"  cx="75"  cy="50" r="11"/>
    <circle class="ear-right" cx="125" cy="50" r="11"/>
    <!-- Ears inner -->
    <circle class="ear-inner-left"  cx="75"  cy="52" r="6"/>
    <circle class="ear-inner-right" cx="125" cy="52" r="6"/>
    <!-- Snout -->
    <ellipse class="snout" cx="100" cy="90" rx="16" ry="12"/>
    <!-- Eyes -->
    <circle class="eye-left"  cx="88"  cy="72" r="3"/>
    <circle class="eye-right" cx="112" cy="72" r="3"/>
    <!-- Nose -->
    <ellipse class="nose" cx="100" cy="85" rx="5" ry="4"/>
    <!-- Mouth -->
    <path class="mouth" d="M100,89 L100,96 Q95,100 91,98 M100,96 Q105,100 109,98"
          fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    """,

    # ---------------------------- GIRAFFE ----------------------------
    "giraffe": """
    <!-- Back legs -->
    <rect class="leg-back" x="58" y="140" width="10" height="45" rx="2"/>
    <rect class="leg-back" x="115" y="140" width="10" height="45" rx="2"/>
    <rect class="hoof" x="56" y="182" width="14" height="4"/>
    <rect class="hoof" x="113" y="182" width="14" height="4"/>
    <!-- Body -->
    <ellipse class="body" cx="95" cy="130" rx="45" ry="20"/>
    <!-- Belly -->
    <ellipse class="belly" cx="95" cy="140" rx="30" ry="10"/>
    <!-- Front legs -->
    <rect class="leg-front" x="72" y="140" width="10" height="45" rx="2"/>
    <rect class="leg-front" x="100" y="140" width="10" height="45" rx="2"/>
    <rect class="hoof" x="70" y="182" width="14" height="4"/>
    <rect class="hoof" x="98" y="182" width="14" height="4"/>
    <!-- Tail -->
    <path class="tail" d="M52,128 q-10,8 -8,18" fill="none" stroke="currentColor" stroke-width="2.5"/>
    <path class="tail-tuft" d="M42,142 q3,4 0,8 q-4,-2 -3,-8 Z"/>
    <!-- Neck -->
    <path class="neck" d="M125,115 L150,40 L168,40 L142,118 Z"/>
    <!-- Mane -->
    <path class="mane" d="M150,40 L168,40 L162,55 L154,55 Z M152,60 L166,60 L161,72 L155,72 Z M156,75 L164,75 L161,85 L157,85 Z"/>
    <!-- Head -->
    <ellipse class="head" cx="160" cy="32" rx="18" ry="14"/>
    <!-- Snout extension -->
    <ellipse class="snout" cx="173" cy="36" rx="8" ry="6"/>
    <!-- Spots -->
    <ellipse class="spot" cx="80"  cy="125" rx="6" ry="5"/>
    <ellipse class="spot" cx="100" cy="120" rx="7" ry="5"/>
    <ellipse class="spot" cx="118" cy="128" rx="6" ry="4"/>
    <ellipse class="spot" cx="90"  cy="138" rx="5" ry="4"/>
    <ellipse class="spot" cx="110" cy="138" rx="6" ry="4"/>
    <ellipse class="spot-neck" cx="148" cy="60" rx="5" ry="6"/>
    <ellipse class="spot-neck" cx="156" cy="85" rx="4" ry="5"/>
    <ellipse class="spot-neck" cx="152" cy="100" rx="5" ry="5"/>
    <!-- Horns (ossicones) -->
    <rect class="horn" x="150" y="14" width="3" height="10" rx="1"/>
    <rect class="horn" x="163" y="14" width="3" height="10" rx="1"/>
    <circle class="horn-tip" cx="151.5" cy="13" r="2.5"/>
    <circle class="horn-tip" cx="164.5" cy="13" r="2.5"/>
    <!-- Ear -->
    <ellipse class="ear" cx="146" cy="22" rx="5" ry="3" transform="rotate(-30 146 22)"/>
    <!-- Eye -->
    <circle class="eye" cx="158" cy="28" r="2"/>
    """,

    # ---------------------------- ZEBRA ----------------------------
    "zebra": """
    <!-- Tail -->
    <path class="tail" d="M155,130 q15,5 15,22" fill="none" stroke="currentColor" stroke-width="2.5"/>
    <path class="tail-tuft" d="M168,150 q3,4 0,10 q-5,-2 -3,-10 Z"/>
    <!-- Back legs -->
    <rect class="leg-back" x="55" y="145" width="12" height="40" rx="2"/>
    <rect class="leg-back" x="138" y="145" width="12" height="40" rx="2"/>
    <rect class="hoof" x="53" y="182" width="16" height="4"/>
    <rect class="hoof" x="136" y="182" width="16" height="4"/>
    <!-- Body -->
    <ellipse class="body" cx="100" cy="130" rx="55" ry="25"/>
    <!-- Belly -->
    <ellipse class="belly" cx="100" cy="145" rx="35" ry="12"/>
    <!-- Front legs -->
    <rect class="leg-front" x="75" y="145" width="12" height="40" rx="2"/>
    <rect class="leg-front" x="115" y="145" width="12" height="40" rx="2"/>
    <rect class="hoof" x="73" y="182" width="16" height="4"/>
    <rect class="hoof" x="113" y="182" width="16" height="4"/>
    <!-- Body stripes -->
    <path class="stripe" d="M60,115 q3,15 0,30 M75,110 q3,20 0,40 M90,108 q3,22 0,44 M105,108 q3,22 0,44 M120,110 q3,20 0,40 M135,115 q3,15 0,30"
          fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <!-- Neck -->
    <path class="neck" d="M138,118 L155,75 L168,80 L150,125 Z"/>
    <!-- Neck stripes -->
    <path class="stripe-neck" d="M145,110 l15,4 M148,98 l16,3 M151,85 l15,2"
          fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    <!-- Mane -->
    <path class="mane" d="M155,75 L168,80 L172,68 L160,62 Z"/>
    <!-- Head -->
    <ellipse class="head" cx="160" cy="65" rx="22" ry="16" transform="rotate(-15 160 65)"/>
    <!-- Head stripes -->
    <path class="stripe-head" d="M150,55 l-2,12 M158,52 l-2,14 M166,53 l-2,14 M174,58 l-3,12"
          fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Ear -->
    <ellipse class="ear" cx="148" cy="48" rx="4" ry="7" transform="rotate(-30 148 48)"/>
    <!-- Eye -->
    <circle class="eye" cx="162" cy="60" r="2.5"/>
    <!-- Nostril -->
    <circle class="nostril" cx="178" cy="70" r="1.5"/>
    """,

    # ---------------------------- MONKEY ----------------------------
    "monkey": """
    <!-- Tail (curly) -->
    <path class="tail" d="M55,140 q-15,5 -18,-8 q-2,-12 8,-10 q6,2 4,8"
          fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
    <!-- Back legs -->
    <ellipse class="leg-back" cx="68"  cy="172" rx="11" ry="12"/>
    <ellipse class="leg-back" cx="132" cy="172" rx="11" ry="12"/>
    <!-- Body -->
    <ellipse class="body" cx="100" cy="138" rx="42" ry="32"/>
    <!-- Belly -->
    <ellipse class="belly" cx="100" cy="148" rx="28" ry="20"/>
    <!-- Arms -->
    <ellipse class="arm-left"  cx="62"  cy="125" rx="9" ry="20" transform="rotate(-20 62 125)"/>
    <ellipse class="arm-right" cx="138" cy="125" rx="9" ry="20" transform="rotate(20 138 125)"/>
    <!-- Hands -->
    <circle class="hand" cx="55" cy="148" r="6"/>
    <circle class="hand" cx="145" cy="148" r="6"/>
    <!-- Feet -->
    <ellipse class="foot" cx="68" cy="183" rx="10" ry="5"/>
    <ellipse class="foot" cx="132" cy="183" rx="10" ry="5"/>
    <!-- Head -->
    <circle class="head" cx="100" cy="72" r="32"/>
    <!-- Ears -->
    <circle class="ear-left"  cx="72" cy="68" r="7"/>
    <circle class="ear-right" cx="128" cy="68" r="7"/>
    <circle class="ear-inner-left"  cx="72" cy="68" r="3.5"/>
    <circle class="ear-inner-right" cx="128" cy="68" r="3.5"/>
    <!-- Face (lighter area) -->
    <ellipse class="face" cx="100" cy="80" rx="22" ry="22"/>
    <!-- Brow ridge -->
    <path class="brow" d="M82,68 q8,-5 15,0 M103,68 q8,-5 15,0"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <!-- Eyes -->
    <circle class="eye-left"  cx="90"  cy="75" r="3"/>
    <circle class="eye-right" cx="110" cy="75" r="3"/>
    <!-- Nose -->
    <ellipse class="nose" cx="100" cy="86" rx="3" ry="2"/>
    <!-- Mouth -->
    <path class="mouth" d="M92,94 Q100,100 108,94"
          fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    """,

    # ---------------------------- FOX ----------------------------
    "fox": """
    <!-- Tail (bushy) -->
    <path class="tail" d="M150,140 q30,-5 32,-30 q-2,-10 -12,-8 q-3,8 -8,14 q-8,8 -16,18 Z"/>
    <path class="tail-tip" d="M178,108 q4,-4 2,-12 q-8,-2 -10,6 q4,2 8,6 Z"/>
    <!-- Back legs -->
    <path class="leg-back" d="M58,160 q3,15 0,25 h14 q0,-13 0,-25 Z"/>
    <path class="leg-back" d="M138,160 q3,15 0,25 h14 q0,-13 0,-25 Z"/>
    <rect class="sock" x="58" y="178" width="14" height="8" rx="1"/>
    <rect class="sock" x="138" y="178" width="14" height="8" rx="1"/>
    <!-- Body -->
    <ellipse class="body" cx="100" cy="135" rx="52" ry="30"/>
    <!-- Belly -->
    <ellipse class="belly" cx="100" cy="150" rx="32" ry="14"/>
    <!-- Front legs -->
    <path class="leg-front" d="M78,160 q-2,15 0,22 h13 q0,-12 0,-22 Z"/>
    <path class="leg-front" d="M115,160 q-2,15 0,22 h13 q0,-12 0,-22 Z"/>
    <rect class="sock" x="78" y="175" width="13" height="8" rx="1"/>
    <rect class="sock" x="115" y="175" width="13" height="8" rx="1"/>
    <!-- Head (pointed) -->
    <path class="head" d="M65,80 Q100,55 135,80 Q130,105 100,108 Q70,105 65,80 Z"/>
    <!-- Snout -->
    <path class="snout" d="M85,92 Q100,118 115,92 Q108,103 100,103 Q92,103 85,92 Z"/>
    <!-- Ears outer (large pointed) -->
    <path class="ear-left"  d="M72,68 L60,30 L92,55 Z"/>
    <path class="ear-right" d="M128,68 L140,30 L108,55 Z"/>
    <!-- Ears inner -->
    <path class="ear-inner-left"  d="M76,62 L70,42 L88,55 Z"/>
    <path class="ear-inner-right" d="M124,62 L130,42 L112,55 Z"/>
    <!-- Cheek (white area) -->
    <ellipse class="cheek" cx="100" cy="98" rx="18" ry="8"/>
    <!-- Eyes -->
    <ellipse class="eye-left"  cx="88"  cy="78" rx="3" ry="4"/>
    <ellipse class="eye-right" cx="112" cy="78" rx="3" ry="4"/>
    <!-- Nose -->
    <ellipse class="nose" cx="100" cy="95" rx="3.5" ry="2.5"/>
    <!-- Mouth -->
    <path class="mouth" d="M100,98 L100,103 Q96,106 93,104 M100,103 Q104,106 107,104"
          fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    """,

    # ---------------------------- PANDA ----------------------------
    "panda": """
    <!-- Back legs (black) -->
    <ellipse class="leg-back" cx="62"  cy="172" rx="14" ry="14"/>
    <ellipse class="leg-back" cx="138" cy="172" rx="14" ry="14"/>
    <!-- Body (white) -->
    <ellipse class="body" cx="100" cy="135" rx="55" ry="38"/>
    <!-- Belly -->
    <ellipse class="belly" cx="100" cy="148" rx="32" ry="20"/>
    <!-- Shoulder band (black) -->
    <path class="shoulder-band" d="M55,118 Q100,108 145,118 Q140,128 100,124 Q60,128 55,118 Z"/>
    <!-- Front legs (black) -->
    <ellipse class="leg-front" cx="78"  cy="170" rx="13" ry="16"/>
    <ellipse class="leg-front" cx="122" cy="170" rx="13" ry="16"/>
    <!-- Head (white) -->
    <circle class="head" cx="100" cy="76" r="36"/>
    <!-- Ears (black) -->
    <circle class="ear-left"  cx="72"  cy="46" r="11"/>
    <circle class="ear-right" cx="128" cy="46" r="11"/>
    <!-- Eye patches (black) -->
    <ellipse class="eye-patch-left"  cx="85"  cy="76" rx="8" ry="10" transform="rotate(-20 85 76)"/>
    <ellipse class="eye-patch-right" cx="115" cy="76" rx="8" ry="10" transform="rotate(20 115 76)"/>
    <!-- Eyes (white pupils) -->
    <circle class="eye-left"  cx="86"  cy="76" r="3"/>
    <circle class="eye-right" cx="114" cy="76" r="3"/>
    <!-- Snout -->
    <ellipse class="snout" cx="100" cy="92" rx="14" ry="10"/>
    <!-- Nose -->
    <ellipse class="nose" cx="100" cy="88" rx="4" ry="3"/>
    <!-- Mouth -->
    <path class="mouth" d="M100,91 L100,98 Q95,102 92,100 M100,98 Q105,102 108,100"
          fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    """,

    # ---------------------------- HIPPO ----------------------------
    "hippo": """
    <!-- Tail (small) -->
    <path class="tail" d="M40,135 q-10,3 -10,12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    <!-- Back legs (stubby) -->
    <rect class="leg-back" x="50" y="148" width="22" height="32" rx="6"/>
    <rect class="leg-back" x="128" y="148" width="22" height="32" rx="6"/>
    <!-- Toes back -->
    <rect class="toe" x="52" y="176" width="6" height="6" rx="1"/>
    <rect class="toe" x="60" y="176" width="6" height="6" rx="1"/>
    <rect class="toe" x="130" y="176" width="6" height="6" rx="1"/>
    <rect class="toe" x="138" y="176" width="6" height="6" rx="1"/>
    <!-- Body (huge barrel) -->
    <ellipse class="body" cx="100" cy="125" rx="65" ry="40"/>
    <!-- Belly -->
    <ellipse class="belly" cx="100" cy="145" rx="42" ry="18"/>
    <!-- Front legs -->
    <rect class="leg-front" x="72" y="148" width="22" height="32" rx="6"/>
    <rect class="leg-front" x="106" y="148" width="22" height="32" rx="6"/>
    <!-- Toes front -->
    <rect class="toe" x="74" y="176" width="6" height="6" rx="1"/>
    <rect class="toe" x="82" y="176" width="6" height="6" rx="1"/>
    <rect class="toe" x="108" y="176" width="6" height="6" rx="1"/>
    <rect class="toe" x="116" y="176" width="6" height="6" rx="1"/>
    <!-- Head (huge, blocky) -->
    <ellipse class="head" cx="100" cy="80" rx="50" ry="35"/>
    <!-- Snout/mouth area -->
    <ellipse class="snout" cx="100" cy="95" rx="42" ry="20"/>
    <!-- Open mouth slit -->
    <path class="mouth" d="M65,98 Q100,108 135,98" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Teeth -->
    <rect class="tooth" x="78" y="103" width="4" height="6" rx="1"/>
    <rect class="tooth" x="118" y="103" width="4" height="6" rx="1"/>
    <!-- Ears (small on top) -->
    <ellipse class="ear-left"  cx="72"  cy="50" r="7"/>
    <ellipse class="ear-right" cx="128" cy="50" r="7"/>
    <ellipse class="ear-inner-left"  cx="72"  cy="50" rx="4" ry="3"/>
    <ellipse class="ear-inner-right" cx="128" cy="50" rx="4" ry="3"/>
    <!-- Eyes (bulgy on top) -->
    <circle class="eye-bump-left"  cx="82"  cy="58" r="7"/>
    <circle class="eye-bump-right" cx="118" cy="58" r="7"/>
    <circle class="eye-left"  cx="82"  cy="58" r="3"/>
    <circle class="eye-right" cx="118" cy="58" r="3"/>
    <!-- Nostrils -->
    <ellipse class="nostril" cx="88"  cy="85" rx="3" ry="4"/>
    <ellipse class="nostril" cx="112" cy="85" rx="3" ry="4"/>
    """,

    # ---------------------------- RHINO ----------------------------
    "rhino": """
    <!-- Tail -->
    <path class="tail" d="M40,130 q-10,5 -8,15" fill="none" stroke="currentColor" stroke-width="2.5"/>
    <path class="tail-tuft" d="M30,144 q3,3 0,7 q-4,-2 -3,-7 Z"/>
    <!-- Back legs -->
    <rect class="leg-back" x="55" y="145" width="18" height="38" rx="3"/>
    <rect class="leg-back" x="130" y="145" width="18" height="38" rx="3"/>
    <rect class="toenail" x="55" y="178" width="18" height="5" rx="1"/>
    <rect class="toenail" x="130" y="178" width="18" height="5" rx="1"/>
    <!-- Body -->
    <ellipse class="body" cx="100" cy="125" rx="60" ry="35"/>
    <!-- Belly -->
    <ellipse class="belly" cx="100" cy="143" rx="40" ry="15"/>
    <!-- Skin folds -->
    <path class="skin-fold" d="M60,140 q5,5 0,12 M140,140 q-5,5 0,12"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <!-- Front legs -->
    <rect class="leg-front" x="78" y="145" width="18" height="38" rx="3"/>
    <rect class="leg-front" x="104" y="145" width="18" height="38" rx="3"/>
    <rect class="toenail" x="78" y="178" width="18" height="5" rx="1"/>
    <rect class="toenail" x="104" y="178" width="18" height="5" rx="1"/>
    <!-- Head (elongated forward) -->
    <ellipse class="head" cx="148" cy="92" rx="34" ry="26"/>
    <!-- Cheek connection -->
    <path class="head" d="M115,90 Q130,75 150,80 L150,105 Q130,110 115,105 Z"/>
    <!-- Horn (big front) -->
    <path class="horn-big" d="M168,78 Q180,55 174,50 Q162,55 160,80 Z"/>
    <!-- Horn (small back) -->
    <path class="horn-small" d="M150,78 Q156,62 152,58 Q144,62 144,80 Z"/>
    <!-- Ears -->
    <ellipse class="ear-left"  cx="128" cy="68" rx="6" ry="9" transform="rotate(-20 128 68)"/>
    <ellipse class="ear-right" cx="136" cy="62" rx="6" ry="9" transform="rotate(-10 136 62)"/>
    <!-- Eye -->
    <circle class="eye" cx="138" cy="88" r="2.5"/>
    <!-- Nostril -->
    <ellipse class="nostril" cx="176" cy="95" rx="3" ry="2"/>
    <!-- Mouth -->
    <path class="mouth" d="M165,105 Q172,108 178,105" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    """,

    # ---------------------------- WOLF ----------------------------
    "wolf": """
    <!-- Tail (down, bushy) -->
    <path class="tail" d="M150,135 Q175,145 178,168 Q172,172 168,160 Q158,150 148,145 Z"/>
    <path class="tail-tip" d="M170,165 q5,3 4,10 q-7,0 -8,-8 Z"/>
    <!-- Back legs -->
    <path class="leg-back" d="M58,160 q3,15 0,25 h14 q0,-13 0,-25 Z"/>
    <path class="leg-back" d="M138,160 q3,15 0,25 h14 q0,-13 0,-25 Z"/>
    <!-- Body -->
    <ellipse class="body" cx="100" cy="135" rx="52" ry="28"/>
    <!-- Belly -->
    <ellipse class="belly" cx="100" cy="148" rx="32" ry="13"/>
    <!-- Back stripe (darker) -->
    <path class="back-stripe" d="M55,118 Q100,108 145,118 Q140,124 100,118 Q60,124 55,118 Z"/>
    <!-- Front legs -->
    <path class="leg-front" d="M78,160 q-2,15 0,22 h13 q0,-12 0,-22 Z"/>
    <path class="leg-front" d="M115,160 q-2,15 0,22 h13 q0,-12 0,-22 Z"/>
    <!-- Neck ruff -->
    <path class="ruff" d="M70,98 Q60,115 75,118 Q85,108 80,95 Z M130,98 Q140,115 125,118 Q115,108 120,95 Z"/>
    <!-- Head (elongated wolf snout) -->
    <path class="head" d="M68,82 Q100,58 132,82 Q128,108 100,108 Q72,108 68,82 Z"/>
    <!-- Snout (long, pointed) -->
    <path class="snout" d="M82,95 Q100,125 118,95 Q110,108 100,108 Q90,108 82,95 Z"/>
    <!-- Ears (pointed up) -->
    <path class="ear-left"  d="M76,68 L70,32 L92,58 Z"/>
    <path class="ear-right" d="M124,68 L130,32 L108,58 Z"/>
    <!-- Ears inner -->
    <path class="ear-inner-left"  d="M79,62 L76,42 L88,58 Z"/>
    <path class="ear-inner-right" d="M121,62 L124,42 L112,58 Z"/>
    <!-- Cheek (lighter mask) -->
    <ellipse class="cheek" cx="100" cy="100" rx="16" ry="6"/>
    <!-- Eyes (almond, fierce) -->
    <ellipse class="eye-left"  cx="86"  cy="80" rx="3.5" ry="2.5" transform="rotate(-15 86 80)"/>
    <ellipse class="eye-right" cx="114" cy="80" rx="3.5" ry="2.5" transform="rotate(15 114 80)"/>
    <!-- Nose -->
    <ellipse class="nose" cx="100" cy="98" rx="4" ry="3"/>
    <!-- Mouth -->
    <path class="mouth" d="M100,101 L100,106 Q94,110 90,107 M100,106 Q106,110 110,107"
          fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    """,

    # ---------------------------- KANGAROO ----------------------------
    "kangaroo": """
    <!-- Tail (huge, on ground for balance) -->
    <path class="tail" d="M55,150 Q20,160 15,180 Q25,182 40,175 Q55,165 70,155 Z"/>
    <!-- Big hind leg/foot -->
    <path class="leg-back" d="M70,130 Q60,150 55,170 Q60,175 80,170 Q85,150 90,135 Z"/>
    <!-- Big foot -->
    <ellipse class="foot" cx="68" cy="175" rx="20" ry="6"/>
    <!-- Body (upright pear shape) -->
    <ellipse class="body" cx="100" cy="115" rx="32" ry="42"/>
    <!-- Belly pouch -->
    <path class="pouch" d="M82,120 Q100,150 118,120 Q115,140 100,142 Q85,140 82,120 Z"/>
    <!-- Small front arms -->
    <ellipse class="arm-left"  cx="78"  cy="95" rx="6" ry="14" transform="rotate(20 78 95)"/>
    <ellipse class="arm-right" cx="122" cy="95" rx="6" ry="14" transform="rotate(-20 122 95)"/>
    <!-- Paws -->
    <circle class="paw" cx="74" cy="110" r="4"/>
    <circle class="paw" cx="126" cy="110" r="4"/>
    <!-- Neck -->
    <path class="neck" d="M88,82 Q100,72 112,82 L110,95 L90,95 Z"/>
    <!-- Head (kangaroo: long muzzle) -->
    <ellipse class="head" cx="100" cy="62" rx="22" ry="20"/>
    <!-- Snout extension -->
    <ellipse class="snout" cx="100" cy="72" rx="14" ry="10"/>
    <!-- Ears (tall pointed) -->
    <ellipse class="ear-left"  cx="88"  cy="36" rx="5" ry="14" transform="rotate(-10 88 36)"/>
    <ellipse class="ear-right" cx="112" cy="36" rx="5" ry="14" transform="rotate(10 112 36)"/>
    <ellipse class="ear-inner-left"  cx="88"  cy="38" rx="2" ry="10" transform="rotate(-10 88 38)"/>
    <ellipse class="ear-inner-right" cx="112" cy="38" rx="2" ry="10" transform="rotate(10 112 38)"/>
    <!-- Eyes -->
    <circle class="eye-left"  cx="92"  cy="60" r="2.5"/>
    <circle class="eye-right" cx="108" cy="60" r="2.5"/>
    <!-- Nose -->
    <ellipse class="nose" cx="100" cy="74" rx="3" ry="2"/>
    <!-- Mouth -->
    <path class="mouth" d="M95,80 Q100,83 105,80" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    """,

    # ---------------------------- SNAKE ----------------------------
    "snake": """
    <!-- Body (coiled S-shape) -->
    <path class="body" d="M20,150
                           Q40,120 70,140
                           Q100,160 130,140
                           Q160,120 175,140
                           Q180,150 170,155
                           Q155,150 140,160
                           Q110,180 80,160
                           Q50,140 30,160
                           Q15,165 20,150 Z"/>
    <!-- Belly stripe (lighter) -->
    <path class="belly" d="M25,152
                            Q42,135 68,150
                            Q100,170 132,150
                            Q158,135 172,150
                            Q160,148 140,158
                            Q110,175 80,158
                            Q50,148 30,158
                            Q25,158 25,152 Z"/>
    <!-- Pattern spots/diamonds along back -->
    <ellipse class="pattern" cx="45"  cy="143" rx="6" ry="4" transform="rotate(-20 45 143)"/>
    <ellipse class="pattern" cx="75"  cy="145" rx="6" ry="4"/>
    <ellipse class="pattern" cx="105" cy="148" rx="6" ry="4"/>
    <ellipse class="pattern" cx="135" cy="145" rx="6" ry="4"/>
    <ellipse class="pattern" cx="160" cy="142" rx="6" ry="4" transform="rotate(20 160 142)"/>
    <!-- Head (raised, diamond shape) -->
    <path class="head" d="M155,135 Q175,115 192,118 Q198,125 195,135 Q190,145 175,148 Q160,148 155,135 Z"/>
    <!-- Eye -->
    <ellipse class="eye-bump" cx="180" cy="125" rx="4" ry="3"/>
    <ellipse class="eye" cx="180" cy="125" rx="2" ry="2.5"/>
    <!-- Nostril -->
    <circle class="nostril" cx="193" cy="128" r="1"/>
    <!-- Tongue (forked) -->
    <path class="tongue" d="M195,134 L208,132 M201,133 L210,128 M201,133 L210,138"
          fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Tail tip (pointed) -->
    <path class="tail-tip" d="M20,150 L8,148 L8,154 Z"/>
    """,

    # ---------------------------- EAGLE ----------------------------
    "eagle": """
    <!-- Tail feathers -->
    <path class="tail" d="M40,140 L10,130 L10,165 L40,158 Z"/>
    <path class="tail-line" d="M15,135 L38,142 M15,148 L38,150 M15,160 L38,156"
          fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
    <!-- Body -->
    <ellipse class="body" cx="95" cy="120" rx="48" ry="40"/>
    <!-- Belly (lighter) -->
    <ellipse class="belly" cx="95" cy="135" rx="30" ry="22"/>
    <!-- Wing (folded, layered feathers) -->
    <path class="wing" d="M75,90 Q130,85 138,135 Q120,148 78,138 Q68,115 75,90 Z"/>
    <!-- Wing feather lines -->
    <path class="wing-feather" d="M82,100 Q108,98 128,118 M80,115 Q108,115 132,128 M82,128 Q108,128 130,138"
          fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Neck (white) -->
    <path class="neck" d="M118,75 Q138,68 148,80 Q142,95 122,92 Z"/>
    <!-- Head (white bald-eagle style) -->
    <circle class="head" cx="145" cy="68" r="22"/>
    <!-- Beak (hooked, yellow) -->
    <path class="beak-top" d="M163,68 L182,72 Q186,75 183,80 L168,76 Z"/>
    <path class="beak-bottom" d="M168,76 L182,80 Q180,82 170,82 Z"/>
    <!-- Eye (fierce) -->
    <circle class="eye-white" cx="150" cy="62" r="5"/>
    <circle class="eye" cx="151" cy="62" r="3"/>
    <!-- Brow ridge -->
    <path class="brow" d="M142,55 Q152,52 158,57" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <!-- Legs (yellow, scaly) -->
    <rect class="leg-left"  x="82" y="155" width="5" height="22" rx="1"/>
    <rect class="leg-right" x="103" y="155" width="5" height="22" rx="1"/>
    <!-- Talons -->
    <path class="talon" d="M78,177 L82,182 M85,177 L86,184 M89,177 L92,182"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path class="talon" d="M99,177 L103,182 M106,177 L107,184 M110,177 L113,182"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    """,

    # ---------------------------- CROCODILE ----------------------------
    "crocodile": """
    <!-- Tail (long, scaly, tapered) -->
    <path class="tail" d="M15,130 Q5,135 8,142 L55,148 L55,138 Z"/>
    <!-- Tail scales (dorsal spikes) -->
    <path class="scale" d="M20,130 L23,124 L26,130 Z M30,128 L33,121 L36,128 Z M40,127 L43,119 L46,127 Z M50,126 L53,118 L56,126 Z"/>
    <!-- Back legs (short, splayed) -->
    <ellipse class="leg-back" cx="70"  cy="155" rx="10" ry="8" transform="rotate(20 70 155)"/>
    <ellipse class="leg-back" cx="145" cy="155" rx="10" ry="8" transform="rotate(-20 145 155)"/>
    <!-- Claws back -->
    <path class="claw" d="M62,162 L60,167 M68,164 L68,169 M74,162 L77,167"
          fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path class="claw" d="M138,162 L135,167 M144,164 L144,169 M150,162 L154,167"
          fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Body (long, low) -->
    <ellipse class="body" cx="100" cy="135" rx="55" ry="18"/>
    <!-- Belly (lighter) -->
    <ellipse class="belly" cx="100" cy="143" rx="40" ry="10"/>
    <!-- Back scales row -->
    <path class="scale" d="M60,123 L63,116 L66,123 Z M72,120 L75,112 L78,120 Z M85,118 L88,110 L91,118 Z M98,117 L101,108 L104,117 Z M111,118 L114,110 L117,118 Z M124,120 L127,112 L130,120 Z M137,123 L140,116 L143,123 Z"/>
    <!-- Front legs -->
    <ellipse class="leg-front" cx="80"  cy="152" rx="9" ry="7" transform="rotate(20 80 152)"/>
    <ellipse class="leg-front" cx="125" cy="152" rx="9" ry="7" transform="rotate(-20 125 152)"/>
    <!-- Claws front -->
    <path class="claw" d="M73,159 L72,163 M79,160 L80,165 M85,158 L88,162"
          fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path class="claw" d="M120,158 L117,162 M125,160 L126,165 M131,159 L132,163"
          fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Head (elongated, flat snout) -->
    <path class="head" d="M150,130 L195,128 Q198,134 195,140 L150,142 Q145,136 150,130 Z"/>
    <!-- Upper jaw line -->
    <path class="jaw-line" d="M150,135 L195,135" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <!-- Teeth (upper) -->
    <path class="tooth" d="M158,135 L160,140 L162,135 Z M167,135 L169,140 L171,135 Z M177,135 L179,140 L181,135 Z M186,135 L188,140 L190,135 Z"/>
    <!-- Eye bump on top of head -->
    <ellipse class="eye-bump" cx="158" cy="125" rx="5" ry="4"/>
    <!-- Eye -->
    <ellipse class="eye" cx="158" cy="125" rx="2.5" ry="3"/>
    <!-- Nostril at end of snout -->
    <ellipse class="nostril" cx="192" cy="131" rx="2" ry="1.5"/>
    """,
}


# ---------------------------------------------------------------------------
# Alias để hỗ trợ nhiều ngôn ngữ / nhiều tên gọi
# ---------------------------------------------------------------------------
ALIASES: Dict[str, str] = {
    # English
    "cat": "cat", "kitten": "cat",
    "dog": "dog", "puppy": "dog",
    "pig": "pig", "piglet": "pig",
    "cow": "cow", "cattle": "cow",
    "rabbit": "rabbit", "bunny": "rabbit",
    "fish": "fish",
    "bird": "bird", "chick": "bird",
    "lion": "lion",
    "tiger": "tiger",
    "elephant": "elephant",
    "bear": "bear",
    "giraffe": "giraffe",
    "zebra": "zebra",
    "monkey": "monkey",
    "fox": "fox",
    "panda": "panda",
    "hippo": "hippo", "hippopotamus": "hippo",
    "rhino": "rhino", "rhinoceros": "rhino",
    "wolf": "wolf",
    "kangaroo": "kangaroo",
    "snake": "snake", "serpent": "snake",
    "eagle": "eagle",
    "crocodile": "crocodile", "croc": "crocodile", "alligator": "crocodile",
    # Vietnamese
    "meo": "cat", "mèo": "cat",
    "cho": "dog", "chó": "dog",
    "lon": "pig", "lợn": "pig", "heo": "pig",
    "bo": "cow", "bò": "cow",
    "tho": "rabbit", "thỏ": "rabbit",
    "ca": "fish", "cá": "fish",
    "chim": "bird",
    "su tu": "lion", "sư tử": "lion",
    "ho": "tiger", "hổ": "tiger", "cop": "tiger", "cọp": "tiger",
    "voi": "elephant",
    "gau": "bear", "gấu": "bear",
    "huou cao co": "giraffe", "hươu cao cổ": "giraffe",
    "ngua van": "zebra", "ngựa vằn": "zebra",
    "khi": "monkey", "khỉ": "monkey",
    "cao": "fox", "cáo": "fox",
    "gau truc": "panda", "gấu trúc": "panda",
    "ha ma": "hippo", "hà mã": "hippo",
    "te giac": "rhino", "tê giác": "rhino",
    "cho soi": "wolf", "chó sói": "wolf", "soi": "wolf", "sói": "wolf",
    "chuot tui": "kangaroo", "chuột túi": "kangaroo", "kanguru": "kangaroo",
    "ran": "snake", "rắn": "snake",
    "dai bang": "eagle", "đại bàng": "eagle", "chim ung": "eagle",
    "ca sau": "crocodile", "cá sấu": "crocodile",
}


def _normalize(name: str) -> Optional[str]:
    """Chuẩn hoá tên con vật về key chuẩn."""
    if not name:
        return None
    key = name.strip().lower()
    return ALIASES.get(key)


def render_animal_svg(
    animal_name: str,
    *,
    size: int = 300,
    colors: Optional[Dict[str, str]] = None,
    background: Optional[str] = None,
) -> str:
    """Render SVG của một con vật.

    Args:
        animal_name: Tên con vật (tiếng Việt hoặc tiếng Anh).
        size: Chiều rộng & cao của SVG xuất ra (px).
        colors: Dict ghi đè màu theo class. Ví dụ {"body": "#abcdef"}.
                Các class không truyền sẽ dùng màu mặc định.
        background: Màu nền SVG (mặc định trong suốt).

    Returns:
        Chuỗi SVG hoàn chỉnh.

    Raises:
        ValueError: Nếu tên con vật không được hỗ trợ.
    """
    key = _normalize(animal_name)
    if key is None or key not in ANIMAL_SHAPES:
        supported = sorted(set(ALIASES.values()))
        raise ValueError(
            f"Không hỗ trợ con vật '{animal_name}'. "
            f"Các tên được hỗ trợ: {supported}"
        )

    # Trộn màu mặc định với màu user truyền vào
    palette = dict(DEFAULT_PALETTES[key])
    if colors:
        palette.update(colors)

    # Tạo block <style> để mỗi class có fill độc lập
    style_rules = []
    for cls, color in palette.items():
        style_rules.append(f"    .{cls} {{ fill: {color}; color: {color}; }}")
    style_block = "<style>\n" + "\n".join(style_rules) + "\n  </style>"

    bg = ""
    if background:
        bg = f'<rect width="200" height="200" fill="{background}"/>'

    shapes = ANIMAL_SHAPES[key].strip()

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="{size}" height="{size}">
  {style_block}
  {bg}
  <g class="animal animal-{key}">
{shapes}
  </g>
</svg>"""
    return svg


def save_animal_svg(
    animal_name: str,
    file_path: str,
    **kwargs,
) -> str:
    """Render SVG và lưu ra file. Trả về đường dẫn file."""
    svg = render_animal_svg(animal_name, **kwargs)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(svg)
    return file_path


def list_supported_animals() -> list:
    """Trả về danh sách các con vật được hỗ trợ."""
    return sorted(ANIMAL_SHAPES.keys())


def list_regions(animal_name: str) -> list:
    """Trả về danh sách các vùng có thể tô màu của 1 con vật."""
    key = _normalize(animal_name)
    if key is None or key not in DEFAULT_PALETTES:
        raise ValueError(f"Không hỗ trợ con vật '{animal_name}'.")
    return list(DEFAULT_PALETTES[key].keys())


if __name__ == "__main__":
    # Demo: render tất cả các con vật ra file
    import os
    os.makedirs("output", exist_ok=True)
    for name in list_supported_animals():
        path = f"output/{name}.svg"
        save_animal_svg(name, path)
        print(f"Saved {path}")

    # Demo đổi màu: mèo đen với mắt vàng
    save_animal_svg(
        "mèo",
        "output/cat_black.svg",
        colors={
            "body": "#2B2B2B", "head": "#2B2B2B", "belly": "#3A3A3A",
            "ear-left": "#2B2B2B", "ear-right": "#2B2B2B",
            "tail": "#2B2B2B", "leg-front": "#2B2B2B", "leg-back": "#2B2B2B",
            "eye-left": "#F4C430", "eye-right": "#F4C430",
        },
    )
    print("Saved output/cat_black.svg (custom colors)")
