# artisys-documents 0.2.0

Núcleo Python compartilhado para processamento **local** de imagens, normalização de OCR e aplicação de regras do consumidor. Substitui o modelo `snapshot`: cada sistema instala uma versão do pacote e mantém suas próprias regras de classificação, campos e armazenamento. Não copie o núcleo para cada produto.

## Instalação

Na raiz deste repositório, com Python 3.10+:

```sh
python -m venv .venv-documents
# Linux/macOS:
. .venv-documents/bin/activate
# Windows PowerShell: .venv-documents\Scripts\Activate.ps1
python -m pip install './modules/artisys-documents[preprocess]'
```

O núcleo depende de Pillow. O extra `preprocess` instala OpenCV headless (sem janela gráfica). Para OCR real:

```sh
python -m pip install './modules/artisys-documents[ocr,preprocess]'
python -m pip install 'paddlepaddle>=3,<4'
```

A disponibilidade do engine PaddlePaddle depende de sistema operacional, arquitetura e versão do Python. Use as [instruções oficiais de instalação](https://www.paddlepaddle.org.cn/install/quick) para escolher uma distribuição compatível; CPU é o padrão. Não instale variantes OpenCV conflitantes no mesmo ambiente. O adaptador usa a [API PaddleOCR 3 `predict`](https://paddlepaddle.github.io/PaddleOCR/main/en/version3.x/pipeline_usage/OCR.html), não a API legada `.ocr()`.

O primeiro uso de PaddleOCR pode baixar modelos. Para instalação do cliente sem internet, provisione antecipadamente modelos compatíveis e passe `--detection-model-dir` e `--recognition-model-dir`. Orientação automática por modelo, correção geométrica e classificador de linha estão desativados; a orientação EXIF é aplicada pelo núcleo. Valide a instalação em uma máquina do mesmo tipo antes de distribuir. O pacote não fornece modelos ou driver de scanner.

## Executar

```sh
artisys-documents recibo.png --output recibo.ocr.json \
  --rules modules/artisys-documents/examples/receipt-rules.json \
  --mode color --lang pt
```

Alternativas: `--mode grayscale` ou `--mode threshold` usam OpenCV. `color` é o padrão e preserva as cores para o OCR. Nenhum modo modifica ou regrava o original. O caminho de saída precisa ter diretório existente e ser um **arquivo novo**. A criação exclusiva recusa sobrescrita, inclusive entre execuções concorrentes. Código de saída 0: JSON gerado; 2: erro de entrada/processamento/escrita. Uma falha de disco durante a escrita pode deixar JSON parcial; o consumidor deve aceitar apenas execuções com código 0 e parse válido.

Entrada: PNG, JPEG, BMP, WEBP estático ou TIFF de uma página, identificados pelo conteúdo. PDF, TIFF multipágina e animações são recusados: converter/dividir é responsabilidade do consumidor. Limites padrão: 20 MiB de arquivo, 25 milhões de pixels, 10 mil linhas e 1 milhão de caracteres OCR. CLI permite `--max-bytes` e `--max-pixels`; API `Limits` permite todos. Limites não substituem isolamento do processo: para filas desktop, execute em worker separado e imponha timeout/memória no host.

## API e contrato

```python
from artisys_documents import PaddleBackend, Limits, process, classify, extract_fields

result = process(
    'recibo.png',
    PaddleBackend(lang='pt'),
    limits=Limits(max_bytes=10 * 1024 * 1024),
    classifier=lambda text: classify(text, {'receipt': ['recibo', 'valor']}),
    extractor=lambda text: extract_fields(text, {'amount': r'R\$\s*([0-9.,]+)'}),
)
```

`schemaVersion: 1` contém SHA-256 dos bytes originais, dimensões após EXIF, modo de pré-processamento, texto concatenado, linhas (`text`, `confidence` de 0 a 1 e `polygon` de quatro pontos), classificação e campos. Coordenadas estão em pixels da imagem após orientação EXIF; não foram redimensionadas. Resultado sem texto é válido e segue para revisão, com linhas vazias.

Uma implementação própria de `Backend.recognize(image)` recebe imagem Pillow RGB e devolve `Line` (lista ou iterável). Paddle converte RGB para BGR apenas dentro do adaptador. O engine só é importado/inicializado quando há uma imagem válida para processar.

Regras JSON: `classification` mapeia nomes para palavras literais obrigatórias; zero ou múltiplas classes compatíveis resultam em `null`. `fields` mapeia nomes para regex; devolve o primeiro grupo capturado ou match inteiro e `null` quando ausente. Regex e callbacks são **código/configuração confiável do produto**, nunca fornecidos por usuário arbitrário: expressões patológicas podem bloquear o processo. Regras não validam CPF, CNPJ, total fiscal ou identidade. O exemplo `examples/process_receipt.py` usa OCR real e regras do consumidor.

`requiresHumanReview` permanece `true`: texto reconhecido e confiança OCR não comprovam assinatura, autenticidade, identidade ou validade fiscal. Não há detector de assinatura nesta versão. O consumidor usa matrícula/ID estável, revisão e suas regras para escolher funcionário/pasta; nome OCR isolado não é chave de roteamento. O módulo não move arquivos nem envia documentos à rede.

## Consumo e atualização

Gere uma wheel e distribua a mesma versão nos servidores locais dos produtos:

```sh
python -m pip wheel ./modules/artisys-documents --no-deps --wheel-dir dist
python -m pip install dist/artisys_documents-0.2.0-py3-none-any.whl
```

Distribua também wheels das dependências compatíveis e modelos para instalações offline. Trave dependências no release do aplicativo consumidor; os intervalos do pacote são compatibilidade declarada, não uma matriz testada. Hooks/regras ficam no repositório de cada produto. Mudanças incompatíveis no JSON exigirão novo `schemaVersion`; não prometer compatibilidade com módulos 0.1.0, que só tinham documentação.

## Verificação

```sh
cd modules/artisys-documents
python -m pip install -e '.[preprocess]'
python -m unittest discover -s tests -v
```

A suíte verifica imagens reais com Pillow/OpenCV, orientação EXIF, regras, limites, erros, contrato de resultado Paddle e CLI sem sobrescrever fonte/saída. Somente a fronteira do motor OCR usa fixture nos testes. **Inferência real PaddleOCR/modelos não foi executada nesta entrega**, portanto a qualidade do reconhecimento e a compatibilidade em Windows/macOS permanecem pendentes de validação no host. O reteste integrado usou Python 3.12/Linux, Pillow 11.3.0 e OpenCV 4.11.0.
