import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { MdAdd, MdChat, MdSearch, MdAccessTime, MdAccountCircle  } from 'react-icons/md';
import { FaProjectDiagram } from 'react-icons/fa';
import "vis-network/styles/vis-network.css";
import { Network } from "vis-network";

const View = {
    Chat: 'Chat',
    Query: 'Query',
    Graph: 'Graph',
} as const;

const TabMode = {
    Actor: 'Actor',
    Moment: 'Moment',
    Block: 'Block',
    NoBlock: 'NoBlock',
} as const;

// Types
type Actor = {
    id: number;
    name: string;
};
type Block = {
    image: string;
    text: string;
    id: number;
    actor: number;
};
type Moment = {
    blocks: number[];
    prev: number | null;
    id: number;
};
type Reference = {
    from: number;
    to: number | null;
};
type Chat = {
    name: string;
    actors: number[];
    moments: number[];
    origin?: number;
    id: number;
};

// Utils
function generateID() {
    return Math.floor(Math.random()*100000);
};

function App() {
  // Global Storage
  const [actors, setActors] = useState<Actor[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);

  // Local Storage 
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [activeMoment, setActiveMoment] = useState<number | null>(null);
  const [activeActor, setActiveActor] = useState<number | null>(null);
  const [activeBlock, setActiveBlock] = useState<number | null>(null);

  // Utilities
  const [view, setView] = useState<View | null>();
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [creatingActor, setCreatingActor] = useState<boolean>(false);
  const [mode, setMode] = useState<string>("actor");
  const [hoveredMoment, setHoveredMoment] = useState<number | null>(null);
  const [tabDir, setTabDir] = useState<TabMode>(TabMode.Actor);
  const [tabMode, setTabMode] = useState<TabMode>(TabMode.NoBlock);
  const [lastMoment, setLastMoment] = useState<number | null>(null);

  // Refs
  const timelinesGraphRef = useRef<HTMLDivElement | null>(null);
  const timelinesRef = useRef<Network | null>(null);
  const referencesGraphRef = useRef<HTMLDivElement | null>(null);
  const referencesRef = useRef<Network | null>(null);

  // Functions
  const addActor = (val) => {
      if(val) {
          const newActor = {
              id: generateID(),
              name: val
          };
          setActors([...actors, newActor]);
          setCreatingActor(false);
          setActiveActor(newActor.id);

          setChats(prevChats => 
            prevChats.map(c => 
                c.id === activeChat 
                ? { ...c, actors: [ ...c.actors, newActor.id ] }
                : c
            )
          );
      }
  };

  const sendMessage = () => {
      let newBlockID;
      if(TabMode.Block !== tabMode) {
          const message = document.getElementById('messageInput').value;
          document.getElementById('messageInput').value = '';

          const newBlock = {
              text: message,
              id: generateID(),
              actor: activeActor,
          }
          newBlockID = newBlock.id;
          setBlocks([...blocks, newBlock]);
        
          const newMoment = {
              blocks: [ newBlock.id ],
              prev: activeMoment,
              id: generateID(),
          }
          setMoments([...moments, newMoment]);
          setActiveMoment(newMoment.id);
          setChats(prevChats =>
            prevChats.map(c =>
                c.id === activeChat
                ? { ...c, moments: [ ...c.moments, newMoment.id ] }
                : c
            )
          )
      }
      else {
          const message = document.getElementById('messageInput').value;
          document.getElementById('messageInput').value = '';

          const newBlock = {
              text: message,
              id: generateID(),
              actor: chat.actors[activeBlock[1]],
          }
          newBlockID = newBlock.id;
          setBlocks([...blocks, newBlock]);

          setMoments(prevMoments => 
            prevMoments.map((m, idx) =>
                idx === activeBlock[0]
                ? { ...m, blocks: [...m.blocks, newBlock.id] }
                : m
            )
          )

          escape();
      }
      setReferences(prevReferences => 
        prevReferences.map(r =>
            !r.to
            ? { ...r, to: newBlockID }
            : r
        )
      )
      const container = document.querySelector(".container");
  }

  const createChat = (chatName: string, chatOrigin?: Moment) => {
    return {
        name: chatName,
        actors: [],
        moments: [],
        origin: chatOrigin,
        id: generateID(),
    }
  };

  const switchActor = () => {
      if(tabMode===TabMode.NoBlock) {
          if(tabDir === TabMode.Actor) {
              const currentIdx = chat.actors.indexOf(activeActor);
              const nextActor = chat.actors[(currentIdx+1)%actors.length];
              setActiveActor(nextActor);
          }
          if(tabDir === TabMode.Moment) {
              const currentIdx = chat.moments.indexOf(activeMoment);
              const prevMoment = chat.moments[(currentIdx-1+chat.moments.length)%chat.moments.length];
              setActiveMoment(prevMoment);
          }
      }
      if(tabMode===TabMode.Block) {
          if(tabDir === TabMode.Actor) {
              const nextActor = (activeBlock[1]+1)%actors.length;
              setActiveBlock([activeBlock[0], nextActor]);
          }
          if(tabDir === TabMode.Moment) {
              const nextMoment= (activeBlock[0]-1+chat.moments.length)%chat.moments.length;
              setActiveBlock([nextMoment, activeBlock[1]]);
          }
      }
  };

  const autoFill = (key) => {
      if(key==="@" && activeBlock) {
          const activeBlockMoment = chat.moments[activeBlock[0]];
          document.getElementById('messageInput').value += `@${calculateTime(activeBlockMoment)}[${activeBlock[1]}] `;
          document.getElementById('messageInput').focus();

          const targetActor = chat.actors[activeBlock[1]]
          const targetMoment = momentsById[chat.moments[activeBlock[0]]]
          const targetBlocks = targetMoment.blocks.map(b => blocksById[b])
          let target = targetBlocks.find(b => b.actor===targetActor);

          if(!target) {
              const newBlock = {
                  text: "Text",
                  id: generateID(),
                  actor: chat.actors[activeBlock[1]],
              }
              setBlocks([...blocks, newBlock]);

              setMoments(prevMoments => 
                prevMoments.map((m, idx) =>
                    idx === activeBlock[0]
                    ? { ...m, blocks: [...m.blocks, newBlock.id] }
                    : m
                )
              )
              target = targetBlocks.find(b => b.actor===targetActor);
          }
          const newReference = {
              from: target.id,
              to: null,
          }
          setReferences([...references, newReference])
          setActiveBlock(null);
          document.getElementById('messageInput').classList.remove('tabMode')
          setTabDir(TabMode.Actor);
          setTabMode(TabMode.NoBlock);
      }
  }

  const escape = () => {
      if(tabMode===TabMode.Block) {
          setActiveBlock(null);
          document.getElementById('messageInput').classList.remove('tabMode')
          setTabMode(TabMode.NoBlock);
      }
      else {
          setTabMode(TabMode.Block);
          const currentIdx = chat.actors.indexOf(activeActor);
          const momentIdx = chat.moments.indexOf(activeMoment);
          setActiveBlock([momentIdx, currentIdx]);
          document.getElementById('messageInput').classList.add('tabMode')
      }
  }

  const calculateTime = (id) => {
      let timeCount = 0;
      const target = momentsById[id];
      let current = momentsById[id];
      while(current.prev) {
          current = momentsById[current.prev];
          timeCount++;
      }
      const sameMoments = moments.filter(m => m.prev === target.prev)

      return timeCount + '.' + sameMoments.indexOf(target);
  }

  // Hooks 
  useEffect(() => {
      if(view==='Chat' && !activeChat) {
        const newChat = createChat('Chat '+(chats.length+1));
        setChats([...chats,newChat]);
        setActiveChat(newChat.id);
      }
  }, [view]);

  const actorsById = useMemo(
    () => Object.fromEntries(actors.map(a => [a.id, a]))
    ,[actors]
  );

  const momentsById = useMemo(
    () => Object.fromEntries(moments.map(m => [m.id, m]))
    ,[moments]
  );

  const blocksById = useMemo(
    () => Object.fromEntries(blocks.map(b => [b.id, b]))
    ,[blocks]
  );
    
  useEffect(()=> {
    if(activeActor) {
        document.getElementById('messageInput').focus()
    }
  }, [activeActor]);

  useLayoutEffect(() => {
    const el = document.querySelector('.container');
    if(!el) return;
    el.scrollTo({
        top: el.scrollHeight,
        behaviour: "smooth",
    });
  }, [moments])

  useEffect(() => {
      if(!referencesGraphRef.current) return;
      
      const validBlocks = blocks.filter(b => references.find(r => r.from===b.id || r.to===b.id))
      const nodes = validBlocks.map(b => ({ id: b.id, label: b.text }))
      const edges = references     

      referencesRef.current = new Network(
        referencesGraphRef.current,
        { nodes, edges },
        {
            physics: true,
            interaction: { hover: true },
        }
      ) 

      return () => {
          referencesRef.current?.destroy();
      }
  }, [view])

  useEffect(() => {
      if(!timelinesGraphRef.current) return;
      
      const nodes = moments.map(m => ({ id: m.id, label: calculateTime(m.id) }))
      const edges = []
      for(const m of moments) {
          if(m.prev) {
              edges.push({
                  from: m.prev,
                  to: m.id
              })
          }
      }

      timelinesRef.current = new Network(
        timelinesGraphRef.current,
        { nodes, edges },
        {
            physics: true,
            interaction: { hover: true },
        }
      ) 

      return () => {
          timelinesRef.current?.destroy();
      }
  }, [view])

  const chat = chats.find(c => c.id===activeChat);

  return (
    <>
      <div className="buttonBar">
        <button
            className={["viewButton", view===View.Chat?"active":""].join(" ")}
            onClick={() => setView(view === View.Chat ? null : View.Chat)}
        >
            <MdChat size={20} color="white"/>
        </button>
        <button
            className={["viewButton", view===View.Query?"active":""].join(" ")}
            onClick={() => setView(view === View.Query ? null : View.Query)}
        >
            <MdSearch size={20} color="white"/>
        </button>
        <button
            className={["viewButton", view===View.Graph?"active":""].join(" ")}
            onClick={() => setView(view === View.Graph? null : View.Graph)}
        >
            <FaProjectDiagram size={20} color="white"/>
        </button>
      </div>
      <div className="sidebar">
        <input
            placeholder="Search ..."
        >
        </input>
        {
            chats.map((c) => (
                <div 
                    key={c.id} 
                    className={["chatCard", c.id===activeChat?"activeChat":""].join(" ")}
                    onClick={() => setActiveChat(c.id===activeChat?null:c.id)}
                >
                   { c.name } 
                </div>
            ))
        }
      </div>
      <div className="mainView">
        <div className="title">
            {
                view
            }
        </div>
        { creatingActor && 
            <div className="overlay">
                <div className="popup">
                    <input
                        id="actorName"
                        placeholder="Type actor name ..."
                    ></input>
                    <button
                        className="createActor"
                        onClick={
                            () => addActor(document.getElementById("actorName").value)
                        }
                    >
                        Create
                    </button>
                    <button
                        className="createActor"
                        onClick={
                            () => setCreatingActor(false)
                        }
                    >
                        Cancel
                    </button>
                </div>
            </div>
        }
        { view===View.Chat && activeChat &&
            <div className="chatView">
                <div 
                    className="actorBar"
                >
                    <div className="addContainer">
                        <button
                            className="addActor"
                            onClick={() => setCreatingActor(true) }
                        >
                            <MdAdd size={20} color="#aaa" />
                        </button>
                    </div>
                    <div 
                        className={["actorRow", tabDir===TabMode.Actor?"activeBar":""].join(" ")}
                    >
                        {
                            chat.actors.map((id) => {
                                const actor = actorsById[id];
                                if(!actor) return null;

                                return (
                                    <div 
                                        className="actor-col"
                                        key={actor.id} 
                                    >
                                        <div 
                                            key={actor.id} 
                                            className={["actor", actor.id===activeActor?"activeActor":""].join(" ")}
                                            onClick={() => { setActiveActor(actor.id===activeActor?null:actor.id) }}
                                        >
                                            { actor.name[0].toUpperCase() }
                                        </div>
                                    </div>
                                )
                            })
                        }
                    </div>
                </div>
                <div className="container">
                    <div 
                        className={["momentsBar", tabDir===TabMode.Moment?"activeBar":""].join(" ")}
                    >
                        {
                            chat.moments.map((id) => (
                                <div
                                    key={id}
                                    className={[
                                        "momentSelect", 
                                        activeMoment===id?"activeMoment":"",
                                        ].join(" ")}
                                    onMouseEnter={() => setHoveredMoment(id)}
                                    onMouseLeave={() => setHoveredMoment(null)}
                                >
                                    { calculateTime(id) }
                                </div>
                            ))
                        }
                    </div>
                    <div className="blocksContainer">
                        <div className="messages">
                            {
                                chat.moments.map((id, midx) => {
                                    const moment = momentsById[id];
                                    const momentBlocks = moment.blocks.map((b) =>
                                        blocksById[b]
                                    );

                                    const blocks = chat.actors.map((a, bidx) => {
                                        const block= momentBlocks.find((b) => b.actor === a)
                                        if(block?.text) {
                                            return [block.text, activeBlock&&bidx===activeBlock[1]&&midx===activeBlock[0]];
                                        }
                                        else {
                                            return ["", activeBlock&&bidx===activeBlock[1]&&midx===activeBlock[0]];
                                        }
                                    })
                                    

                                    if(!moment) return null;
                                    return (
                                        <div
                                            className={[
                                                "moment", 
                                                hoveredMoment===id?"hoveredMoment":"",
                                                ].join(" ")}
                                            key={id}
                                        >
                                            {
                                                blocks.map(b => (
                                                    <div
                                                        className={["block", b[1]?"activeBlock":""].join(" ")}
                                                        key={generateID()}
                                                    >
                                                        { b[0] &&
                                                            <div className="message">{ b[0] }</div>
                                                        }
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                </div>
                        {
                            activeActor && 
                            <div
                                className="input"
                            >
                                <input
                                    id="messageInput"
                                    placeholder="Type a message ..."
                                    onKeyDown={
                                        (e) => {
                                            if(e.key=="Enter") {
                                                sendMessage();
                                            }
                                            if(e.key=="Tab") {
                                                e.preventDefault();
                                                switchActor();
                                            }
                                            if(e.key=="Shift") {
                                                setTabDir(tabDir===TabMode.Moment?TabMode.Actor:TabMode.Moment);
                                            }
                                            if(e.key=="&" || e.key=="@") {
                                                e.preventDefault();
                                                autoFill(e.key);
                                            }
                                            if(e.key=="Escape") {
                                                escape();
                                            }
                                        }
                                    }
                                ></input>
                            </div>
                        }
            </div>
        }
        { view===View.Graph && 
            <div className="queryView">
                <div
                    ref={timelinesGraphRef}
                    className="timelinesGraph"
                ></div>
                <div
                    ref={referencesGraphRef}
                    className="referencesGraph"
                ></div>
            </div>
        }
      </div>
    </>
  )
}

export default App
