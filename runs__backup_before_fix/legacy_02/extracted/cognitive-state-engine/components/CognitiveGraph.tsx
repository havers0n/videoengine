import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Particle, SimulationLink, CognitiveState } from '../types';
import { STATE_COLORS } from '../constants';

interface CognitiveGraphProps {
  particles: Particle[];
  onNodeClick: (p: Particle) => void;
  width: number;
  height: number;
}

const CognitiveGraph: React.FC<CognitiveGraphProps> = ({ particles, onNodeClick, width, height }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  // Keep simulation ref to update nodes without restarting entirely
  const simulationRef = useRef<d3.Simulation<Particle, SimulationLink> | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clean init

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    // Initial setup of simulation
    const simulation = d3.forceSimulation<Particle, SimulationLink>()
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force("collide", d3.forceCollide().radius((d) => 10 + d.confidence * 20).iterations(2))
      .force("x", d3.forceX(width / 2).strength(0.01))
      .force("y", d3.forceY(height / 2).strength(0.01));

    simulationRef.current = simulation;

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [width, height]);

  // Update loop
  useEffect(() => {
    if (!simulationRef.current || !svgRef.current) return;
    
    const simulation = simulationRef.current;
    const svg = d3.select(svgRef.current);
    const g = svg.select("g");

    // Filter out decayed particles for visual clarity if needed, 
    // but we keep them to show history until they are purged by the parent
    const activeParticles = particles; 

    // Links (dynamic based on proximity or shared state could be added here, 
    // but for now we focus on particles as autonomous agents in a field)
    
    // Update data
    simulation.nodes(activeParticles);
    
    // Warm up the simulation slightly on large data changes to prevent explosion
    simulation.alpha(0.3).restart();

    // RENDER NODES
    const node = g.selectAll<SVGGElement, Particle>(".node")
      .data(activeParticles, (d) => d.id);

    // EXIT
    node.exit()
      .transition().duration(500)
      .attr("opacity", 0)
      .remove();

    // ENTER
    const nodeEnter = node.enter()
      .append("g")
      .attr("class", "node")
      .attr("cursor", "pointer")
      .call(d3.drag<SVGGElement, Particle>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      )
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      });

    // Node Circle (Outer Glow for Uncertainty)
    nodeEnter.append("circle")
      .attr("class", "glow")
      .attr("r", 0)
      .attr("fill", "none")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.5);

    // Node Circle (Main Body)
    nodeEnter.append("circle")
      .attr("class", "body")
      .attr("r", 0)
      .attr("fill", (d) => STATE_COLORS[d.state]);

    // Label
    nodeEnter.append("text")
      .attr("dy", 4)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#fff")
      .style("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.8)")
      .attr("opacity", 0)
      .text((d) => d.text.length > 10 ? d.text.substring(0, 9) + "…" : d.text);

    // MERGE
    const nodeUpdate = nodeEnter.merge(node as any);

    // Visual transitions based on state properties
    nodeUpdate.select(".body")
      .transition().duration(300)
      .attr("fill", (d: Particle) => STATE_COLORS[d.state])
      .attr("r", (d: Particle) => {
        // Radius depends on confidence
        const baseR = 12;
        const confidenceR = d.confidence * 15;
        return baseR + confidenceR;
      })
      .attr("opacity", (d: Particle) => 1 - d.decay);

    nodeUpdate.select(".glow")
      .transition().duration(300)
      .attr("stroke", (d: Particle) => STATE_COLORS[d.state])
      .attr("r", (d: Particle) => {
         const baseR = 12 + d.confidence * 15;
         return baseR + 2 + (d.uncertainty * 10);
      })
      .attr("opacity", (d: Particle) => (1 - d.decay) * 0.6)
      .style("stroke-dasharray", (d: Particle) => d.uncertainty > 0.5 ? "2,2" : "none");

    nodeUpdate.select("text")
      .transition().duration(300)
      .attr("opacity", (d: Particle) => d.decay > 0.8 ? 0 : 1);

    // Tick function
    simulation.on("tick", () => {
      nodeUpdate.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // Drag handlers
    function dragstarted(event: any, d: Particle) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: Particle) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: Particle) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

  }, [particles, width, height, onNodeClick]);

  return (
    <div className="w-full h-full bg-slate-900 overflow-hidden relative">
        <svg ref={svgRef} width={width} height={height} className="block w-full h-full" />
    </div>
  );
};

export default CognitiveGraph;