// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Play, Undo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const BewegingsSpel = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [speed, setSpeed] = useState({ x: 0, y: 0 });
  const [route, setRoute] = useState([{ x: 0, y: 0 }]);
  const [routeInput, setRouteInput] = useState('');
  const [hindernisInput, setHindernisInput] = useState('');
  const [hindernissen, setHindernissen] = useState([]);
  const [botsing, setBotsing] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [moveHistory, setMoveHistory] = useState([]);
  const canvasRef = useRef(null);

  const gridGrootte = 40;
  const basisBreedte = 600;
  const basisHoogte = 400;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    tekenSpel(ctx);
  }, [position, route, zoom, hindernissen, botsing]);

  useEffect(() => {
    updateZoom();
  }, [route, hindernissen]);

  const updateZoom = () => {
    const alleCoordinaten = [...route, ...hindernissen.flat()];
    const xBereik = Math.max(...alleCoordinaten.map(p => Math.abs(p.x)), 7);
    const yBereik = Math.max(...alleCoordinaten.map(p => Math.abs(p.y)), 5);
    const xZoom = basisBreedte / ((xBereik * 2 + 1) * gridGrootte);
    const yZoom = basisHoogte / ((yBereik * 2 + 1) * gridGrootte);
    setZoom(Math.min(xZoom, yZoom));
  };

  const tekenSpel = (ctx) => {
    const canvasBreedte = basisBreedte / zoom;
    const canvasHoogte = basisHoogte / zoom;
    ctx.save();
    ctx.clearRect(0, 0, canvasBreedte, canvasHoogte);
    ctx.scale(zoom, zoom);
    ctx.translate(canvasBreedte / 2 + gridGrootte / 2, canvasHoogte / 2 + gridGrootte / 2);

    tekenRaster(ctx, canvasBreedte, canvasHoogte);
    tekenHindernissen(ctx);
    tekenRoute(ctx);
    tekenStip(ctx);
    if (botsing) tekenBotsing(ctx);

    ctx.restore();
  };
  
const tekenRaster = (ctx, breedte, hoogte) => {
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1 / zoom;

  // Bereken startpunt dat deelbaar is door gridGrootte
  let startX = Math.floor(-breedte / 2 / gridGrootte) * gridGrootte;
  let startY = Math.floor(-hoogte / 2 / gridGrootte) * gridGrootte;
  let eindX = Math.ceil(breedte / 2 / gridGrootte) * gridGrootte;
  let eindY = Math.ceil(hoogte / 2 / gridGrootte) * gridGrootte;

  // Verticale lijnen
  for (let x = startX; x <= eindX; x += gridGrootte) {
    ctx.beginPath();
    ctx.moveTo(x, -hoogte / 2);
    ctx.lineTo(x, hoogte / 2);
    ctx.stroke();
  }

  // Horizontale lijnen
  for (let y = startY; y <= eindY; y += gridGrootte) {
    ctx.beginPath();
    ctx.moveTo(-breedte / 2, y);
    ctx.lineTo(breedte / 2, y);
    ctx.stroke();
  }

  // Zwarte assen (deze blijven hetzelfde)
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2 / zoom;
  ctx.beginPath();
  ctx.moveTo(-breedte / 2, 0);
  ctx.lineTo(breedte / 2, 0);
  ctx.moveTo(0, -hoogte / 2);
  ctx.lineTo(0, hoogte / 2);
  ctx.stroke();
};

  const tekenStip = (ctx) => {
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(position.x * gridGrootte, -position.y * gridGrootte, 8 / zoom, 0, 2 * Math.PI); // Radius verhoogd van 5 naar 8
    ctx.fill();
  };

  const tekenRoute = (ctx) => {
    if (route.length < 2) return;

    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2 / zoom;
    ctx.beginPath();
    ctx.moveTo(route[0].x * gridGrootte, -route[0].y * gridGrootte);

    for (let i = 1; i < route.length; i++) {
      ctx.lineTo(route[i].x * gridGrootte, -route[i].y * gridGrootte);
    }

    ctx.stroke();
  };


  const tekenHindernissen = (ctx) => {
    ctx.strokeStyle = '#FF4444';
    ctx.lineWidth = 3 / zoom;

    hindernissen.forEach(hindernis => {
      if (hindernis.length === 1) {
        // Teken een punt voor hindernissen met één coördinaat
        ctx.beginPath();
        ctx.arc(hindernis[0].x * gridGrootte, -hindernis[0].y * gridGrootte, 5 / zoom, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
      } else {
        // Teken een lijn voor hindernissen met meerdere coördinaten
        ctx.beginPath();
        ctx.moveTo(hindernis[0].x * gridGrootte, -hindernis[0].y * gridGrootte);
        for (let i = 1; i < hindernis.length; i++) {
          ctx.lineTo(hindernis[i].x * gridGrootte, -hindernis[i].y * gridGrootte);
        }
        ctx.stroke();
      }
    });
  };


  const tekenBotsing = (ctx) => {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(botsing.x * gridGrootte, -botsing.y * gridGrootte, 10 / zoom, 0, 2 * Math.PI);
    ctx.fill();
  };


  const controleerBotsing = (vanPos, naarPos) => {
  for (const hindernis of hindernissen) {
    if (hindernis.length === 1) {
      // Voor een punt-hindernis controleren we of het punt precies op de lijn ligt
      const punt = hindernis[0];
      
      // Check of punt op het lijnsegment ligt door te controleren:
      // 1. Of de afstand vanPos->punt + punt->naarPos gelijk is aan vanPos->naarPos
      // 2. Of het punt binnen de uitersten van het lijnsegment valt
      const d1 = Math.sqrt((punt.x - vanPos.x)**2 + (punt.y - vanPos.y)**2);
      const d2 = Math.sqrt((naarPos.x - punt.x)**2 + (naarPos.y - punt.y)**2);
      const d3 = Math.sqrt((naarPos.x - vanPos.x)**2 + (naarPos.y - vanPos.y)**2);
      
      const puntLigtOpLijn = Math.abs(d1 + d2 - d3) < 0.0001; // kleine marge voor afrondingsfouten
      const xInBereik = punt.x >= Math.min(vanPos.x, naarPos.x) && punt.x <= Math.max(vanPos.x, naarPos.x);
      const yInBereik = punt.y >= Math.min(vanPos.y, naarPos.y) && punt.y <= Math.max(vanPos.y, naarPos.y);
      
      if (puntLigtOpLijn && xInBereik && yInBereik) {
        return true;
      }
    } else {
      // Bestaande lijnstuk-botsingsdetectie
      for (let i = 0; i < hindernis.length - 1; i++) {
        const p1 = hindernis[i];
        const p2 = hindernis[i + 1];
        if (lijnSegmentenKruisen(
          vanPos.x, vanPos.y, naarPos.x, naarPos.y,
          p1.x, p1.y, p2.x, p2.y
        )) {
          return true;
        }
      }
    }
  }
  return false;
};

  const lijnSegmentenKruisen = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    const noemer = (x4 - x3) * (y1 - y2) - (x1 - x2) * (y4 - y3);
    if (noemer === 0) return false;

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / noemer;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / noemer;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  };

  const getSnelheidVector = (snelheid = speed) => {
    return Math.sqrt(snelheid.x ** 2 + snelheid.y ** 2).toFixed(2);
  };

  const beweeg = (richting) => {
    let nieuweSnelheid = { ...speed };
    switch (richting) {
      case 'N': nieuweSnelheid.y++; break;
      case 'Z': nieuweSnelheid.y--; break;
      case 'O': nieuweSnelheid.x++; break;
      case 'W': nieuweSnelheid.x--; break;
      default: break;
    }
    setSpeed(nieuweSnelheid);
    updatePositie(nieuweSnelheid, richting);
  };

  const updatePositie = (nieuweSnelheid, richting = '') => {
    const nieuwePositie = {
      x: position.x + nieuweSnelheid.x,
      y: position.y + nieuweSnelheid.y
    };

    if (controleerBotsing(position, nieuwePositie)) {
      setBotsing(nieuwePositie);
      return;
    }

    setBotsing(null);
    setPosition(nieuwePositie);
    setRoute([...route, nieuwePositie]);

    if (richting) {
      setMoveHistory([
        ...moveHistory,
        `${richting} (${nieuwePositie.x},${nieuwePositie.y}) snelheid ${getSnelheidVector(nieuweSnelheid)}`
      ]);
    }
  };

  const maakLastStapOngedaan = () => {
    if (route.length <= 1 || botsing) return;
    const nieuweRoute = route.slice(0, -1);
    setPosition(nieuweRoute[nieuweRoute.length - 1]);
    setRoute(nieuweRoute);
    setMoveHistory(moveHistory.slice(0, -1));
    setBotsing(null);
  };

  const voerRouteUit = () => {
    const stappen = routeInput.toUpperCase().split('');
    let huidigeSnelheid = { ...speed };
    let huidigePositie = { ...position };
    let nieuweRoute = [...route];
    let nieuweGeschiedenis = [...moveHistory];

    for (const stap of stappen) {
      switch (stap) {
        case 'N': huidigeSnelheid.y++; break;
        case 'Z': huidigeSnelheid.y--; break;
        case 'O': huidigeSnelheid.x++; break;
        case 'W': huidigeSnelheid.x--; break;
        case 'P': break;
        default: continue;
      }

      const nieuwePositie = {
        x: huidigePositie.x + huidigeSnelheid.x,
        y: huidigePositie.y + huidigeSnelheid.y
      };

      if (controleerBotsing(huidigePositie, nieuwePositie)) {
        setBotsing(nieuwePositie);
        break;
      }

      huidigePositie = nieuwePositie;
      nieuweRoute.push(nieuwePositie);
      if (stap !== 'P') {
        nieuweGeschiedenis.push(
            `${stap} (${nieuwePositie.x},${nieuwePositie.y}) snelheid ${getSnelheidVector(huidigeSnelheid)}`
        );
      }
    }

    setSpeed(huidigeSnelheid);
    setPosition(huidigePositie);
    setRoute(nieuweRoute);
    setMoveHistory(nieuweGeschiedenis);
    setRouteInput('');
  };


  const voegHindernissenToe = () => {
    try {
      const coordinaten = hindernisInput.split(' ')
        .map(coord => {
          const [x, y] = coord.split(',').map(Number);
          if (isNaN(x) || isNaN(y)) throw new Error('Ongeldige coördinaten');
          return { x, y };
        });
      
      if (coordinaten.length < 1) throw new Error('Geen coördinaten ingevoerd');
      setHindernissen([...hindernissen, coordinaten]);
      setHindernisInput('');
    } catch (e) {
      alert('Ongeldige invoer. Gebruik het formaat: x1,y1 [x2,y2 x3,y3 ...]');
    }
  };

return (
    <div className="flex gap-4 p-4">
      <div>
        <canvas ref={canvasRef} width={basisBreedte} height={basisHoogte} className="border border-gray-300" />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div></div>
            <Button onClick={() => beweeg('N')}><ArrowUp /></Button>
            <div></div>
            <Button onClick={() => beweeg('W')}><ArrowLeft /></Button>
            <Button onClick={() => updatePositie(speed)}><Play /></Button>
            <Button onClick={() => beweeg('O')}><ArrowRight /></Button>
            <div></div>
            <Button onClick={() => beweeg('Z')}><ArrowDown /></Button>
            <Button onClick={maakLastStapOngedaan}><Undo /></Button>
          </div>
      </div>

      <div className="w-96">
        <div className="flex gap-2 mb-2">
          <Input
              value={routeInput}
              onChange={(e) => setRouteInput(e.target.value)}
              placeholder="Voer route in (bijv. NOZWP)"
          />
          <Button onClick={voerRouteUit}>Uitvoeren</Button>
        </div>

        <div className="flex gap-2 mb-2">
          <Input
              value={hindernisInput}
              onChange={(e) => setHindernisInput(e.target.value)}
              placeholder="Voer hindernissen in (bijv. 1,1 2,2 -1,2)"
          />
          <Button onClick={voegHindernissenToe}>Toevoegen</Button>
        </div>

        {botsing && (
            <Alert className="mb-2">
              <AlertTitle>Botsing gedetecteerd!</AlertTitle>
              <AlertDescription>
                Er is een botsing gedetecteerd bij ({botsing.x}, {botsing.y}).
                Maak de laatste stap ongedaan om een andere route te kiezen.
              </AlertDescription>
            </Alert>
        )}

        <div className="space-y-2">
          <p>Huidige Positie: ({position.x}, {position.y})</p>
          <p>Huidige Snelheid: ({speed.x}, {speed.y})</p>
          <p>Lengte Snelheidsvector: {getSnelheidVector()}</p>
          <Textarea
              value={moveHistory.join('\n')}
              readOnly
              className="h-96"
          />
        </div>
      </div>
    </div>
);
};

export default BewegingsSpel;
