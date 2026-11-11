"use strict";
/* Isolated international-team Poisson score-matrix and Asian Handicap model. */
(function(root){
  const OUTCOMES=["full_win","half_win","push","half_loss","full_loss"];
  function poisson(lambda,maxGoals=20){
    if(typeof lambda!=="number"||!Number.isFinite(lambda)||lambda<0||!Number.isInteger(maxGoals)||maxGoals<1) throw new TypeError("Invalid Poisson parameters");
    const values=[Math.exp(-lambda)];
    for(let goals=1;goals<=maxGoals;goals++) values[goals]=values[goals-1]*lambda/goals;
    return values;
  }
  function splitLine(line){
    if(typeof line!=="number"||!Number.isFinite(line)||Math.abs(line*4-Math.round(line*4))>1e-8) throw new TypeError("Handicap line must be in quarter-goal increments");
    const quarter=Math.abs(Math.round(line*4))%2===1;
    return quarter?[line-0.25,line+0.25]:[line];
  }
  function settleMargin(margin,line){
    const adjusted=margin+line;
    if(Math.abs(adjusted)<1e-9)return "push";
    return adjusted>0?"win":"loss";
  }
  function classify(margin,line){
    const states=splitLine(line).map(part=>settleMargin(margin,part));
    if(states.every(x=>x==="win"))return "full_win";
    if(states.every(x=>x==="loss"))return "full_loss";
    if(states.every(x=>x==="push"))return "push";
    if(states.includes("win"))return "half_win";
    return "half_loss";
  }
  function buildScoreMatrix(lambdaHome,lambdaAway,maxGoals=20){
    const home=poisson(lambdaHome,maxGoals),away=poisson(lambdaAway,maxGoals);
    const rows=[];
    let includedMass=0;
    for(let h=0;h<=maxGoals;h++)for(let a=0;a<=maxGoals;a++){
      const probability=home[h]*away[a];
      includedMass+=probability;
      rows.push({home_goals:h,away_goals:a,probability});
    }
    const omittedTailMass=Math.max(0,1-includedMass);
    return {rows,includedMass,omittedTailMass,maxGoals};
  }
  function probabilitiesForLine(matrix,line){
    if(!matrix||!Array.isArray(matrix.rows)||!Number.isFinite(matrix.includedMass)||matrix.includedMass<=0)throw new TypeError("Invalid score matrix");
    if(matrix.omittedTailMass>0.001)throw new RangeError("Score matrix tail exceeds 0.1%; expand goal range");
    const probabilities=Object.fromEntries(OUTCOMES.map(key=>[key,0]));
    for(const row of matrix.rows)probabilities[classify(row.home_goals-row.away_goals,line)]+=row.probability/matrix.includedMass;
    return probabilities;
  }
  function calculateHandicapGrid(lambdaHome,lambdaAway,lines,maxGoals=20){
    if(!Array.isArray(lines)||!lines.length)throw new TypeError("At least one model scenario line is required");
    const matrix=buildScoreMatrix(lambdaHome,lambdaAway,maxGoals);
    return {distribution:"independent_poisson",max_goals_per_team:maxGoals,omitted_tail_mass:matrix.omittedTailMass,lines:lines.map(line=>({home_line:line,probabilities:probabilitiesForLine(matrix,line)}))};
  }
  function canCapturePreMatch(kickoffUtc,capturedAt){
    const kickoff=Date.parse(kickoffUtc||""),captured=Date.parse(capturedAt||"");
    return Number.isFinite(kickoff)&&Number.isFinite(captured)&&captured<kickoff;
  }
  const api={OUTCOMES,poisson,splitLine,classify,buildScoreMatrix,probabilitiesForLine,calculateHandicapGrid,canCapturePreMatch};
  root.FootballTimeInternationalHandicapModel=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
