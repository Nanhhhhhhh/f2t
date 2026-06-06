import os, torch
import importlib.util as ilu

DP = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "dynamic-pricing-final"))

def _imp(rel, name):
    spec = ilu.spec_from_file_location(name, os.path.join(DP, rel))
    m = ilu.module_from_spec(spec); spec.loader.exec_module(m); return m

def test_ddqn_loads_and_infers():
    net_mod = _imp("src/rl/network.py", "dp_net")
    Net = net_mod.SharedMLPDuelingQNet
    ckpt = torch.load(os.path.join(DP, "checkpoints", "rl_shared_best.pt"), map_location="cpu", weights_only=False)
    net = Net(obs_dim=10, n_cats=4, cat_embed_dim=8, hidden=128, n_actions=11)
    sd = ckpt["online"]
    if any(k.startswith("_orig_mod.") for k in sd):
        sd = {k[len("_orig_mod."):]: v for k, v in sd.items()}
    missing, unexpected = net.load_state_dict(sd, strict=False)
    assert not missing, f"missing keys: {missing}"
    assert not unexpected, f"unexpected keys: {unexpected}"
    net.eval()
    obs = torch.zeros(1, 10); cat = torch.tensor([0]); mask = torch.ones(1, 11, dtype=torch.bool)
    with torch.no_grad():
        q = net(obs, cat, mask)
    assert q.shape == (1, 11), q.shape

def test_forecaster_loads_and_infers():
    fc_mod = _imp("src/forecaster/model.py", "dp_fc")
    ck = torch.load(os.path.join(DP, "checkpoints", "forecaster_v4_best.pt"), map_location="cpu", weights_only=False)
    cfg = fc_mod.ForecasterConfig(**ck["model_cfg"])
    net = fc_mod.ForecasterLSTM(cfg)
    missing, unexpected = net.load_state_dict(ck["model_state"], strict=False)
    assert not missing, f"missing keys: {missing}"
    assert not unexpected, f"unexpected keys: {unexpected}"
    net.eval()
    feat = torch.zeros(1, 21, cfg.obs_dim); cidx = torch.tensor([0])
    with torch.no_grad():
        out = net(feat, cidx)
    assert "demand" in out and "waste_logit" in out
