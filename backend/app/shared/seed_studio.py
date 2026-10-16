"""Idempotent seed script for Studio entities (personas, profiles, pieces)."""
import asyncio
import uuid
from sqlalchemy import select
from app.shared.database import async_session
from app.models.persona import Persona
from app.models.profile import Profile
from app.models.piece import Piece


async def seed_studio():
    async with async_session() as session:
        # Seed personas if empty
        result = await session.execute(select(Persona).limit(1))
        if not result.scalars().first():
            personas = [
                Persona(
                    id=str(uuid.uuid4()),
                    name="Gestor de Agência",
                    archetype="Decisor",
                    pain_points="Falta de visibilidade em tempo real das entregas; retrabalho por falha de comunicação",
                    goals="Reduzir turnaround em 30%; ter painel único de operação",
                    demographics="35-50 anos; gestor de agência digital ou consultoria",
                    status="active",
                ),
                Persona(
                    id=str(uuid.uuid4()),
                    name="Produtor de Conteúdo",
                    archetype="Criativo",
                    pain_points="Briefings incompletos; aprovação lenta; falta de histórico de peças",
                    goals="Fluxo editorial claro; feedback rápido; reuso de ativos",
                    demographics="25-40 anos; redator, designer ou social media",
                    status="active",
                ),
            ]
            session.add_all(personas)
            print(f"Seeded {len(personas)} personas")
        else:
            print("Personas already seeded, skipping")

        # Seed profiles if empty
        result = await session.execute(select(Profile).limit(1))
        if not result.scalars().first():
            persona_result = await session.execute(select(Persona).limit(2))
            personas_list = list(persona_result.scalars().all())
            profiles = []
            if len(personas_list) >= 1:
                profiles.append(Profile(
                    id=str(uuid.uuid4()),
                    persona_id=personas_list[0].id,
                    name="LinkedIn Institucional",
                    platform="linkedin",
                    tone="profissional-analítico",
                    guidelines="Tom executivo; dados quantitativos; CTA para agendamento",
                    status="active",
                ))
            if len(personas_list) >= 2:
                profiles.append(Profile(
                    id=str(uuid.uuid4()),
                    persona_id=personas_list[1].id,
                    name="Blog Editorial",
                    platform="blog",
                    tone="didático-conversacional",
                    guidelines="SEO-first; exemplos práticos; links internos",
                    status="active",
                ))
            if profiles:
                session.add_all(profiles)
                print(f"Seeded {len(profiles)} profiles")
        else:
            print("Profiles already seeded, skipping")

        # Seed pieces if empty
        result = await session.execute(select(Piece).limit(1))
        if not result.scalars().first():
            profile_result = await session.execute(select(Profile).limit(1))
            profile = profile_result.scalars().first()
            from sqlalchemy import text
            proj_result = await session.execute(text("SELECT id FROM projects LIMIT 1"))
            proj_row = proj_result.fetchone()
            piece = Piece(
                id=str(uuid.uuid4()),
                profile_id=profile.id if profile else None,
                project_id=proj_row[0] if proj_row else None,
                title="Como reduzir retrabalho com automação de workflows",
                content_type="article",
                stage="idea",
                body=None,
                status="draft",
            )
            session.add(piece)
            print("Seeded 1 piece")
        else:
            print("Pieces already seeded, skipping")

        await session.commit()
        print("Studio seed completed successfully")


if __name__ == "__main__":
    asyncio.run(seed_studio())