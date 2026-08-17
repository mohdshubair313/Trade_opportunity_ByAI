"""CRUD operations for Analysis model."""
from typing import Optional, List
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.analysis import Analysis


class AnalysisCRUD:
    """CRUD operations for Analysis model."""
    
    @staticmethod
    def create_analysis(db: Session, user_id: int, sector: str, report: str, 
                       sources_analyzed: int, saved_path: str = None) -> Analysis:
        """Create a new analysis record."""
        analysis = Analysis(
            user_id=user_id,
            sector=sector,
            report=report,
            sources_analyzed=sources_analyzed,
            saved_path=saved_path
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        return analysis
    
    @staticmethod
    def get_user_analyses(db: Session, user_id: int, limit: int = 50, offset: int = 0) -> List[Analysis]:
        """Get user's analysis history."""
        return db.query(Analysis)\
            .filter(Analysis.user_id == user_id)\
            .order_by(Analysis.created_at.desc())\
            .offset(offset)\
            .limit(limit)\
            .all()
    
    @staticmethod
    def count_user_analyses(db: Session, user_id: int) -> int:
        """Count total analyses for a user."""
        return db.query(func.count(Analysis.id)).filter(Analysis.user_id == user_id).scalar() or 0

    @staticmethod
    def get_analysis_by_id(db: Session, analysis_id: int, user_id: int) -> Optional[Analysis]:
        """Get specific analysis by ID for a user."""
        return db.query(Analysis)\
            .filter(Analysis.id == analysis_id, Analysis.user_id == user_id)\
            .first()
    
    @staticmethod
    def delete_analysis(db: Session, analysis: Analysis):
        """Delete an analysis."""
        db.delete(analysis)
        db.commit()
