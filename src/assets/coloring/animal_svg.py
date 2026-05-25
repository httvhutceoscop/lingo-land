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
    # Vietnamese
    "meo": "cat", "mèo": "cat",
    "cho": "dog", "chó": "dog",
    "lon": "pig", "lợn": "pig", "heo": "pig",
    "bo": "cow", "bò": "cow",
    "tho": "rabbit", "thỏ": "rabbit",
    "ca": "fish", "cá": "fish",
    "chim": "bird",
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
