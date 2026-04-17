from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from backend.engine import GameState, VALID_CHARACTERS

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory game store (single session for prototype)
_games: dict[str, GameState] = {}


@app.get("/health")
def health():
    return {"status": "ok"}


class NewGameRequest(BaseModel):
    character: str

    @field_validator("character")
    @classmethod
    def validate_character(cls, v: str) -> str:
        if v not in VALID_CHARACTERS:
            raise ValueError(f"unknown character: {v!r}")
        return v


@app.post("/game/new")
def new_game(req: NewGameRequest):
    state = GameState(req.character)
    _games["current"] = state
    return state.to_dict()


class PlayMoveRequest(BaseModel):
    card_index: int
    from_sq: str
    to_sq: str


@app.post("/game/play/move")
def play_move(req: PlayMoveRequest):
    state = _games.get("current")
    if state is None:
        raise HTTPException(status_code=404, detail="no active game")
    result = state.play_move_card(req.card_index, req.from_sq, req.to_sq)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return state.to_dict()


class PlaySummonRequest(BaseModel):
    card_index: int
    piece_type: str
    to_sq: str


@app.post("/game/play/summon")
def play_summon(req: PlaySummonRequest):
    state = _games.get("current")
    if state is None:
        raise HTTPException(status_code=404, detail="no active game")
    result = state.play_summon_card(req.card_index, req.piece_type, req.to_sq)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return state.to_dict()


@app.post("/game/end-turn")
def end_turn():
    state = _games.get("current")
    if state is None:
        raise HTTPException(status_code=404, detail="no active game")
    result = state.end_turn()
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return state.to_dict()


@app.get("/game/state")
def get_state():
    state = _games.get("current")
    if state is None:
        raise HTTPException(status_code=404, detail="no active game")
    return state.to_dict()
