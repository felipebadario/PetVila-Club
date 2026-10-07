"""Gera src/assets/brand/vila-panorama.svg: a fileira de casinhas da Vila.

A faixa é mais larga que a tela (2 telas de 1440) para o Manifesto percorrê-la
na horizontal conforme o scroll. As casas são sempre as mesmas 12 da frente e 9
de trás, só reordenadas a cada volta para a Vila não parecer um carimbo.
Uso: python3 scripts/vila-panorama.py > src/assets/brand/vila-panorama.svg
"""
import sys

W, H = 2880, 220
PAT, TER, CHA = '#E25D28', '#562A22', '#FFE1BC'
BACK = '#9A4123'  # Patinha misturada à Terra: fileira de trás, mais distante
out = []


def n(v):
    return f'{v:g}'


def house(x, w, h, roof, fill, door=True, wins=()):
    top = H - h
    if roof == 'gable':
        d = f'M{n(x)} {H}V{top}L{n(x + w / 2)} {n(top - w * 0.42)}L{n(x + w)} {top}V{H}Z'
    elif roof == 'arch':
        d = f'M{n(x)} {H}V{top}A{n(w / 2)} {n(w / 2)} 0 0 1 {n(x + w)} {top}V{H}Z'
    else:
        d = f'M{n(x)} {H}V{top}H{n(x + w)}V{H}Z'
    out.append(f'<path fill="{fill}" d="{d}"/>')
    for wx, wy, ww, wh, kind in wins:
        px, py = x + wx, top + wy
        if kind == 'round':
            r = ww / 2
            out.append(f'<path fill="{CHA}" d="M{n(px)} {n(py + wh)}V{n(py + r)}A{n(r)} {n(r)} 0 0 1 {n(px + ww)} {n(py + r)}V{n(py + wh)}Z"/>')
        elif kind == 'circle':
            out.append(f'<circle fill="{CHA}" cx="{n(px + ww / 2)}" cy="{n(py + ww / 2)}" r="{n(ww / 2)}"/>')
        else:
            out.append(f'<rect fill="{CHA}" x="{n(px)}" y="{n(py)}" width="{ww}" height="{wh}" rx="3"/>')
    if door:
        dw, dh = min(34, w * 0.28), min(52, h * 0.5)
        dx, r = x + (w - dw) / 2, dw / 2
        out.append(f'<path fill="{TER}" d="M{n(dx)} {H}V{n(H - dh + r)}A{n(r)} {n(r)} 0 0 1 {n(dx + dw)} {n(H - dh + r)}V{H}Z"/>')


def tree(cx, h, r):
    out.append(f'<rect fill="{BACK}" x="{n(cx - 3)}" y="{H - h}" width="6" height="{h}"/>')
    out.append(f'<circle fill="{BACK}" cx="{n(cx)}" cy="{n(H - h - r * 0.6)}" r="{r}"/>')


# (largura, altura, telhado, janelas) e o vão até a próxima casa.
FRONT = [
    (120, 78, 'gable', [(18, 18, 22, 26, 'sq'), (80, 18, 22, 26, 'sq')]),
    (96, 104, 'arch', [(30, 6, 36, 36, 'circle')]),
    (130, 70, 'flat', [(14, 16, 26, 22, 'sq'), (90, 16, 26, 22, 'sq')]),
    (92, 96, 'gable', [(32, 14, 28, 30, 'round')]),
    (110, 62, 'arch', [(16, 10, 22, 24, 'round'), (72, 10, 22, 24, 'round')]),
    (150, 118, 'arch', [(20, 30, 28, 36, 'round'), (102, 30, 28, 36, 'round'), (55, -30, 40, 40, 'circle')]),
    (104, 84, 'gable', [(16, 16, 22, 26, 'sq'), (66, 16, 22, 26, 'sq')]),
    (124, 66, 'flat', [(18, 14, 24, 22, 'sq'), (82, 14, 24, 22, 'sq')]),
    (90, 100, 'arch', [(27, 12, 36, 36, 'circle')]),
    (118, 80, 'gable', [(16, 16, 22, 26, 'sq'), (80, 16, 22, 26, 'sq')]),
    (100, 64, 'arch', [(14, 10, 22, 24, 'round'), (64, 10, 22, 24, 'round')]),
    (80, 96, 'gable', [(28, 16, 24, 28, 'round')]),
]
FRONT_GAPS = [15, 15, 14, 16, 14, 16, 14, 14, 14, 14, 14, 14]
BACK_ROW = [(90, 120, 'gable'), (70, 150, 'arch'), (110, 105, 'flat'), (80, 140, 'gable'), (90, 165, 'arch'),
            (100, 120, 'gable'), (70, 150, 'arch'), (110, 110, 'flat'), (90, 140, 'gable')]
BACK_GAPS = [60, 80, 60, 90, 130, 50, 70, 60, 80]
TREES = [(58, 24), (70, 28), (60, 26), (64, 26)]
# Ordem das casas em cada volta (a primeira é a composição original).
ORDERS = [list(range(12)), [5, 9, 2, 8, 0, 11, 4, 7, 1, 10, 3, 6], [3, 10, 6, 1, 8, 4, 0, 9, 11, 2, 7, 5]]
BACK_ORDERS = [list(range(9)), [4, 0, 7, 2, 8, 5, 1, 6, 3], [6, 3, 8, 1, 5, 0, 4, 2, 7]]


def row(specs, gaps, orders, start, place):
    x, turn = start, 0
    while x < W:
        for i in orders[turn % len(orders)]:
            if x >= W:
                break
            place(x, specs[i], i)
            x += specs[i][0] + gaps[i]
        turn += 1


# Fileira de trás (sem portas, só janelas acesas) com árvores nos vãos maiores.
def place_back(x, spec, i):
    w, h, roof = spec
    house(x, w, h, roof, BACK, door=False, wins=[(w / 2 - 7, 22, 14, 18, 'sq')])
    if BACK_GAPS[i] >= 70:
        th, tr = TREES[i % len(TREES)]
        tree(x + w + BACK_GAPS[i] / 2, th, tr)


row(BACK_ROW, BACK_GAPS, BACK_ORDERS, 20, place_back)
# Fileira da frente, em Patinha, colada ao chão da seção seguinte.
row(FRONT, FRONT_GAPS, ORDERS, -10, lambda x, s, i: house(x, s[0], s[1], s[2], PAT, wins=s[3]))
out.append(f'<rect fill="{PAT}" x="0" y="{H - 6}" width="{W}" height="6"/>')
sys.stdout.write(
    f'<svg xmlns="http://www.w3.org/2000/svg" aria-label="A Vila PetVila" viewBox="0 0 {W} {H}" '
    f'width="{W}" height="{H}" overflow="hidden">' + ''.join(out) + '</svg>\n'
)
