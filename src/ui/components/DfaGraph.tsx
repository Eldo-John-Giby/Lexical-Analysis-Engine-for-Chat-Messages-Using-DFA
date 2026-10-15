import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { DFA } from '../../engine/types';
import { ZoomIn, ZoomOut, Maximize2, Download, Eye, Sparkles } from 'lucide-react';

cytoscape.use(dagre);

interface DfaGraphProps {
  dfa: DFA;
  atomLabels: string[];
  ruleName?: string;
  ruleColor?: string;
  onSelectState?: (stateId: number | null) => void;
  activeStateId?: number | null;
}

export const DfaGraph: React.FC<DfaGraphProps> = ({
  dfa,
  atomLabels,
  ruleName = 'DFA',
  ruleColor = '#7C5CFF',
  onSelectState,
  activeStateId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [focusedState, setFocusedState] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Build elements
    const elements: cytoscape.ElementDefinition[] = [];

    // Nodes
    for (let s = 0; s < dfa.numStates; s++) {
      const isStart = s === dfa.start;
      const isAccept = dfa.acceptRule[s] !== undefined && dfa.acceptRule[s] !== -1;
      const ruleId = dfa.acceptRule[s];

      let label = `q${s}`;
      if (isStart && isAccept) label = `→ q${s}*`;
      else if (isStart) label = `→ q${s}`;
      else if (isAccept) label = `q${s}*`;

      elements.push({
        data: {
          id: `q${s}`,
          label,
          stateId: s,
          isStart,
          isAccept,
          ruleId,
        },
      });
    }

    // Merge transitions p -> q
    const edgeMap = new Map<string, number[]>();
    for (let s = 0; s < dfa.numStates; s++) {
      for (let a = 0; a < dfa.numAtoms; a++) {
        const target = dfa.table[s * dfa.numAtoms + a]!;
        if (target !== -1) {
          const key = `${s}->${target}`;
          if (!edgeMap.has(key)) edgeMap.set(key, []);
          edgeMap.get(key)!.push(a);
        }
      }
    }

    for (const [key, atoms] of edgeMap.entries()) {
      const [from, to] = key.split('->');
      let edgeLabel = '';
      if (atoms.length > 3) {
        edgeLabel = `${atoms.length} symbols`;
      } else {
        edgeLabel = atoms.map((a) => atomLabels[a] || `a${a}`).join(',');
      }

      elements.push({
        data: {
          id: `e_${from}_${to}`,
          source: `q${from}`,
          target: `q${to}`,
          label: edgeLabel,
        },
      });
    }

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      layout: {
        name: 'dagre',
        rankDir: 'LR',
        nodeSep: 40,
        rankSep: 60,
      } as any,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            color: '#E6EAF5',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '11px',
            'text-valign': 'center',
            'text-halign': 'center',
            'background-color': '#141C33',
            'border-width': '2px',
            'border-color': '#1F2A4A',
            width: '38px',
            height: '38px',
            'transition-property': 'background-color, border-color, width, height, opacity',
            'transition-duration': 0.15,
          },
        },
        {
          selector: 'node[?isAccept]',
          style: {
            'border-color': ruleColor,
            'border-width': '3px',
            'border-style': 'double',
            'background-color': '#1A223E',
          },
        },
        {
          selector: 'node[?isStart]',
          style: {
            'border-color': '#34D399',
            'border-width': '2.5px',
          },
        },
        {
          selector: 'edge',
          style: {
            label: 'data(label)',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '9px',
            color: '#8A94B2',
            'text-rotation': 'autorotate',
            'text-margin-y': -8,
            'curve-style': 'bezier',
            'line-color': '#1F2A4A',
            'target-arrow-color': '#7C5CFF',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.8,
            width: 1.5,
          },
        },
        {
          selector: '.highlighted',
          style: {
            'background-color': '#7C5CFF',
            'border-color': '#FFFFFF',
            'border-width': '3px',
            color: '#FFFFFF',
            width: '44px',
            height: '44px',
          },
        },
        {
          selector: '.dimmed',
          style: {
            opacity: 0.15,
          },
        },
      ],
      wheelSensitivity: 0.2,
    });

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const sId = node.data('stateId');
      setFocusedState(sId);
      if (onSelectState) onSelectState(sId);

      if (focusMode) {
        // Highlight 2-hop neighborhood
        const neighborhood = node.neighborhood().add(node);
        const twoHops = neighborhood.neighborhood().add(neighborhood);
        cy.elements().removeClass('dimmed');
        cy.elements().not(twoHops).addClass('dimmed');
      }
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        cy.elements().removeClass('dimmed');
        setFocusedState(null);
        if (onSelectState) onSelectState(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [dfa, atomLabels, ruleColor, focusMode]);

  // Update active state highlight
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    cy.nodes().removeClass('highlighted');
    if (activeStateId !== null && activeStateId !== undefined) {
      cy.nodes(`[stateId = ${activeStateId}]`).addClass('highlighted');
    }
  }, [activeStateId]);

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current?.fit(undefined, 30);

  const exportPng = () => {
    if (!cyRef.current) return;
    const png64 = cyRef.current.png({ full: true, scale: 2, bg: '#070A12' });
    const a = document.createElement('a');
    a.href = png64;
    a.download = `${ruleName.toLowerCase()}-dfa.png`;
    a.click();
  };

  return (
    <div className="relative w-full h-full min-h-[420px] bg-[#070A12] border border-[#1F2A4A] rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Overlay Toolbar */}
      <div className="absolute top-3 right-3 z-20 flex items-center space-x-1.5 bg-[#0E1424]/90 backdrop-blur border border-[#1F2A4A] p-1.5 rounded-xl shadow-lg">
        <button
          onClick={() => {
            setFocusMode(!focusMode);
            if (cyRef.current) cyRef.current.elements().removeClass('dimmed');
          }}
          className={`p-1.5 rounded-lg text-xs transition-colors ${
            focusMode ? 'bg-[#7C5CFF] text-white' : 'text-[#8A94B2] hover:text-[#E6EAF5]'
          }`}
          title="Toggle Focus Mode (2-hop neighborhood on click)"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-lg text-[#8A94B2] hover:text-[#E6EAF5] hover:bg-[#141C33] transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-lg text-[#8A94B2] hover:text-[#E6EAF5] hover:bg-[#141C33] transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleFit}
          className="p-1.5 rounded-lg text-[#8A94B2] hover:text-[#E6EAF5] hover:bg-[#141C33] transition-colors"
          title="Fit view to graph"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={exportPng}
          className="p-1.5 rounded-lg text-[#8A94B2] hover:text-[#E6EAF5] hover:bg-[#141C33] transition-colors"
          title="Export high-res PNG"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
};
