##Converter um PDF apenas
python convert_pdf.py "C:\Users\carlo\Downloads\Projetos a Estudar\Agencia\knowledge\LivrosPDF\Negocios\100m_leads-Alex_Hormozi.pdf" --autor "Alex Hormozi" --dominio negocios

##Para converter a pasta inteira de uma vez (todos os PDFs de Psicologia):
python convert_pdf.py "C:\Users\carlo\Downloads\Projetos a Estudar\Agencia\knowledge\LivrosPDF\Psicologia & Comportamento" --batch --dominio psicologia

##Para converter a pasta inteira de uma vez e já colocar na pasta correta(Psicologia):
python convert_pdf.py "C:\Users\carlo\Downloads\Projetos a Estudar\Agencia\knowledge\LivrosPDF\Psicologia & Comportamento" --batch --dominio psicologia --output "C:\Users\carlo\Downloads\Projetos a Estudar\Agencia\knowledge\raw\livros"


"C:\Users\carlo\Downloads\Projetos a Estudar\Agencia\knowledge\LivrosPDF\Negocios\100m_leads-Alex_Hormozi.pdf"