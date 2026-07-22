import html.parser
import json

class ModalInspector(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.elements = []
        self.styles = []
        self.in_style = False
        self.style_content = []

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        elem_id = attr_dict.get('id', '')
        elem_class = attr_dict.get('class', '')
        
        keywords = ['modal', 'overlay', 'panel', 'hud', 'dialog', 'popup', 'card', 'screen']
        matched_kw = [kw for kw in keywords if kw in elem_id.lower() or kw in elem_class.lower()]
        
        if matched_kw or tag in ['dialog', 'header', 'footer']:
            self.elements.append({
                'tag': tag,
                'id': elem_id,
                'class': elem_class,
                'line': self.getpos()[0],
                'keywords': matched_kw
            })

        if tag == 'style':
            self.in_style = True
            self.style_content = []

    def handle_endtag(self, tag):
        if tag == 'style':
            self.in_style = False
            self.styles.append("".join(self.style_content))

    def handle_data(self, data):
        if self.in_style:
            self.style_content.append(data)

with open(r"C:\VibeCode\Hangeul Valley\index.html", "r", encoding="utf-8") as f:
    content = f.read()

parser = ModalInspector()
parser.feed(content)

print(f"Total CSS <style> blocks: {len(parser.styles)}")
print(f"Total elements matching HUD/Modal/Panel keywords: {len(parser.elements)}")
print("\nList of HUD / Modal / Panel / Card / Overlay elements:")
for e in parser.elements:
    print(f"Line {e['line']:4d} | Tag: <{e['tag']:6s}> | ID: {e['id']:30s} | Class: {e['class']}")
