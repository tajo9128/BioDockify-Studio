"""
Active Learning + Bayesian Optimization for compound screening.
Suggests next compounds to evaluate based on expected improvement.
"""

import numpy as np
import logging
from typing import List, Dict, Any, Tuple, Optional

logger = logging.getLogger(__name__)


class BayesianOptimizer:
    """
    Bayesian optimization for compound screening.
    Uses Gaussian Process to model the objective function
    and Expected Improvement to select next compounds.
    """

    def __init__(self, n_initial: int = 20, kernel_length_scale: float = 1.0):
        self.X: List[List[float]] = []
        self.y: List[float] = []
        self.n_initial = n_initial
        self.kernel_length_scale = kernel_length_scale
        self._gp = None
        self._fitted = False

    def _init_gp(self):
        """Initialize Gaussian Process with Matern kernel."""
        try:
            from sklearn.gaussian_process import GaussianProcessRegressor
            from sklearn.gaussian_process.kernels import Matern, WhiteKernel

            kernel = Matern(length_scale=self.kernel_length_scale, nu=1.5) + WhiteKernel(noise_level=0.1)
            self._gp = GaussianProcessRegressor(
                kernel=kernel,
                alpha=1e-4,
                n_restarts_optimizer=5,
                random_state=42,
                normalize_y=True,
            )
            self._fitted = True
        except ImportError:
            logger.warning("scikit-learn not available, falling back to random selection")
            self._fitted = False

    def fit(self, X: List[List[float]], y: List[float]):
        """Fit the GP model on observed data."""
        self.X = [list(x) for x in X]
        self.y = list(y)

        if len(self.X) < 2:
            return

        if self._gp is None:
            self._init_gp()

        if self._fitted:
            try:
                X_arr = np.array(self.X)
                y_arr = np.array(self.y)
                self._gp.fit(X_arr, y_arr)
            except Exception as e:
                logger.warning(f"GP fitting failed: {e}")
                self._fitted = False

    def suggest_next(self, candidate_pool: List[List[float]], n_suggest: int = 5) -> List[Dict[str, Any]]:
        """
        Suggest next compounds to evaluate using Expected Improvement.
        Returns list of {index, expected_improvement, uncertainty} dicts.
        """
        if not candidate_pool:
            return []

        # If not enough data or GP failed, return random
        if len(self.X) < self.n_initial or not self._fitted or self._gp is None:
            import random
            indices = random.sample(range(len(candidate_pool)), min(n_suggest, len(candidate_pool)))
            return [{"index": i, "expected_improvement": 0.0, "uncertainty": 1.0, "strategy": "random"} for i in indices]

        try:
            from scipy.stats import norm

            X_pool = np.array(candidate_pool)
            mu, sigma = self._gp.predict(X_pool, return_std=True)

            best_y = max(self.y) if self.y else 0
            xi = 0.01  # exploration parameter

            Z = (mu - best_y - xi) / (sigma + 1e-8)
            ei = (mu - best_y - xi) * norm.cdf(Z) + sigma * norm.pdf(Z)

            # Rank by expected improvement
            ranked_indices = np.argsort(-ei)
            suggestions = []
            for idx in ranked_indices[:n_suggest]:
                suggestions.append({
                    "index": int(idx),
                    "expected_improvement": round(float(ei[idx]), 4),
                    "predicted_score": round(float(mu[idx]), 4),
                    "uncertainty": round(float(sigma[idx]), 4),
                    "strategy": "bayesian",
                })

            return suggestions

        except Exception as e:
            logger.warning(f"Bayesian suggestion failed: {e}")
            import random
            indices = random.sample(range(len(candidate_pool)), min(n_suggest, len(candidate_pool)))
            return [{"index": i, "expected_improvement": 0.0, "uncertainty": 1.0, "strategy": "random"} for i in indices]

    def get_model_metrics(self) -> Dict[str, Any]:
        """Get current model performance metrics."""
        if not self._fitted or self._gp is None or len(self.X) < 2:
            return {"status": "not_fitted", "n_observations": len(self.X)}

        try:
            X_arr = np.array(self.X)
            y_arr = np.array(self.y)
            y_pred = self._gp.predict(X_arr)

            from sklearn.metrics import r2_score, mean_absolute_error
            r2 = r2_score(y_arr, y_pred)
            mae = mean_absolute_error(y_arr, y_pred)

            return {
                "status": "fitted",
                "n_observations": len(self.X),
                "r2": round(float(r2), 4),
                "mae": round(float(mae), 4),
                "best_score": round(float(max(self.y)), 4),
                "worst_score": round(float(min(self.y)), 4),
            }
        except Exception as e:
            return {"status": "error", "error": str(e), "n_observations": len(self.X)}

    def reset(self):
        """Reset the optimizer for a new screening campaign."""
        self.X = []
        self.y = []
        self._gp = None
        self._fitted = False


class ActiveLearningLoop:
    """
    Closed-loop active learning for compound screening.
    Iteratively: suggest → evaluate → update → suggest.
    """

    def __init__(self, n_initial: int = 20, batch_size: int = 10, max_iterations: int = 20):
        self.optimizer = BayesianOptimizer(n_initial=n_initial)
        self.batch_size = batch_size
        self.max_iterations = max_iterations
        self.iteration = 0
        self.history: List[Dict[str, Any]] = []

    def run_iteration(self, candidate_pool: List[List[float]],
                      evaluate_fn) -> Dict[str, Any]:
        """
        Run one iteration of active learning.
        evaluate_fn: callable that takes list of indices and returns list of scores.
        """
        if self.iteration >= self.max_iterations:
            return {"status": "max_iterations_reached", "iteration": self.iteration}

        # Suggest next batch
        suggestions = self.optimizer.suggest_next(candidate_pool, n_suggest=self.batch_size)

        if not suggestions:
            return {"status": "no_suggestions", "iteration": self.iteration}

        # Evaluate suggested compounds
        indices = [s["index"] for s in suggestions]
        try:
            scores = evaluate_fn(indices)
        except Exception as e:
            return {"status": "evaluation_failed", "error": str(e), "iteration": self.iteration}

        # Update model
        for s, score in zip(suggestions, scores):
            idx = s["index"]
            self.optimizer.X.append(candidate_pool[idx])
            self.optimizer.y.append(score)

        self.optimizer.fit(self.optimizer.X, self.optimizer.y)

        self.iteration += 1
        self.history.append({
            "iteration": self.iteration,
            "n_evaluated": len(suggestions),
            "best_score": max(self.optimizer.y) if self.optimizer.y else None,
            "suggestions": suggestions,
        })

        return {
            "status": "completed",
            "iteration": self.iteration,
            "n_evaluated": len(suggestions),
            "best_score": max(self.optimizer.y) if self.optimizer.y else None,
            "model_metrics": self.optimizer.get_model_metrics(),
        }

    def get_results(self) -> Dict[str, Any]:
        """Get full active learning results."""
        return {
            "total_iterations": self.iteration,
            "total_evaluations": sum(h.get("n_evaluated", 0) for h in self.history),
            "best_score": max(self.optimizer.y) if self.optimizer.y else None,
            "history": self.history,
            "model_metrics": self.optimizer.get_model_metrics(),
        }
