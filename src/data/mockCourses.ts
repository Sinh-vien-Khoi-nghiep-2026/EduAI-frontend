import { Course, Assignment, TopicMastery, ActivityLog, ExerciseSet } from '../types';

export const INITIAL_COURSES: Course[] = [
  {
    id: 'cs201',
    code: 'CS201',
    title: 'Data Structures & Algorithms',
    instructor: 'Prof. Elena Rostova',
    department: 'Computer Science',
    description: 'Fundamental data structures including Trees, Graphs, Hash Tables, and Heap implementations paired with O(N) complexity analysis.',
    thumbnail: 'https://images.unsplash.com/photo-1516116211223-4c7141323385?auto=format&fit=crop&w=600&q=80',
    enrolledStudentsCount: 142,
    progressPercent: 68,
    strongTopics: ['Binary Search Trees', 'Big-O Complexity Analysis', 'Hash Tables'],
    weakTopics: ['Depth-First Search (DFS)', 'Breadth-First Search (BFS)', 'AVL Tree Rotations'],
    knowledgeBase: [
      {
        id: 'kb-clrs',
        title: 'Introduction to Algorithms (CLRS 4th Ed)',
        type: 'textbook',
        pagesOrSize: '840 pages',
        sourceName: 'MIT Press Official Textbook',
        uploadedAt: '2026-01-10',
        summary: 'Standard computer science reference covering tree traversals, balanced search trees, and asymptotic notation.',
        snippet: 'Chapter 12.1: A binary search tree is organized in a binary tree. We can represent such a tree by a linked data structure in which each node is an object.'
      },
      {
        id: 'kb-slides-w4',
        title: 'Week 4 Lecture Slides - Binary Search Trees & Traversal',
        type: 'slides',
        pagesOrSize: '42 slides',
        sourceName: 'Prof. Rostova Lecture Deck',
        uploadedAt: '2026-02-01',
        summary: 'Official slides covering In-order, Pre-order, Post-order traversal and BST deletion edge cases.',
        snippet: 'Slide 18: In-order traversal of a BST visits nodes in strictly ascending sorted order. Complexity O(N).'
      },
      {
        id: 'kb-tree-ref',
        title: 'Graph & Tree Traversal Reference Manual',
        type: 'notes',
        pagesOrSize: '12 pages PDF',
        sourceName: 'CS Dept Reference Sheet',
        uploadedAt: '2026-02-05',
        summary: 'Cheat sheet for BFS queues, DFS stack recursion, and cycle detection in directed graphs.',
        snippet: 'BFS utilizes a Queue FIFO structure to visit graph nodes layer-by-layer. DFS uses an explicit or implicit call Stack.'
      },
      {
        id: 'kb-midterm-bank',
        title: 'Official CS201 Question Bank & Midterm Archives',
        type: 'question_bank',
        pagesOrSize: '150 questions',
        sourceName: 'Course Exam Registry',
        uploadedAt: '2026-01-15',
        summary: 'Practice questions on tree height calculations, rotation steps, and recurrence relations.'
      }
    ],
    modules: [
      {
        id: 'm1',
        title: 'Module 1: Foundations & Asymptotic Complexity',
        description: 'Analyzing runtimes with Big-O, Big-Omega, and Recurrence Trees.',
        lessons: [
          {
            id: 'les-101',
            title: 'Lesson 1.1: Asymptotic Analysis & Big-O Notation',
            durationMinutes: 25,
            completed: true,
            keyConcepts: ['Worst-case complexity', 'O(1) vs O(N) vs O(N log N)', 'Space complexity'],
            groundingSources: ['CLRS Chapter 3.1', 'Week 1 Slides'],
            content: `### Asymptotic Complexity Analysis
Asymptotic notation is used to describe the running time or space requirements of an algorithm when the input size $n$ becomes arbitrarily large.

#### Key Notations:
- **Big-O ($O$)**: Tight upper bound. $f(n) = O(g(n))$ means $f(n)$ grows no faster than $g(n)$.
- **Big-Omega ($\Omega$)**: Lower bound.
- **Big-Theta ($\Theta$)**: Tight bound where $f(n)$ is bounded both above and below by $g(n)$.`
          },
          {
            id: 'les-102',
            title: 'Lesson 1.2: Dynamic Arrays & Linked Lists',
            durationMinutes: 35,
            completed: true,
            keyConcepts: ['Amortized runtime', 'Pointer manipulation', 'Memory locality'],
            groundingSources: ['CLRS Chapter 10.2'],
            content: `Dynamic arrays double their capacity when full, granting an amortized insertion complexity of $O(1)$. Linked lists allow $O(1)$ head insertions at the cost of non-contiguous cache access.`
          }
        ]
      },
      {
        id: 'm2',
        title: 'Module 2: Trees & Binary Search Trees',
        description: 'Node relationships, search properties, and tree height invariants.',
        lessons: [
          {
            id: 'les-201',
            title: 'Lesson 2.1: Binary Search Tree Invariants & Insertion',
            durationMinutes: 30,
            completed: true,
            keyConcepts: ['BST property', 'Left child <= Root < Right child', 'Search runtime $O(h)$'],
            groundingSources: ['CLRS Chapter 12', 'Week 4 Slides'],
            content: `A **Binary Search Tree (BST)** satisfies the invariant: for any node $X$, all keys in $X$'s left subtree are smaller than $X.key$, and all keys in $X$'s right subtree are greater than $X.key$. Search, minimum, maximum, and insertion take $O(h)$ time where $h$ is the height of the tree.`
          },
          {
            id: 'les-202',
            title: 'Lesson 2.2: Tree Traversals (In-order, Pre-order, Post-order)',
            durationMinutes: 40,
            completed: false,
            keyConcepts: ['In-order BST sort', 'Pre-order serialization', 'Post-order deletion / evaluation'],
            groundingSources: ['Week 4 Slides Slide 15-22', 'Tree Reference Manual'],
            content: `Tree traversal visits every node exactly once:
- **In-order (Left, Root, Right)**: Yields sorted order for BSTs.
- **Pre-order (Root, Left, Right)**: Useful for copying or cloning tree structures.
- **Post-order (Left, Right, Root)**: Ideal for bottom-up cleanup or evaluating syntax trees.`
          },
          {
            id: 'les-203',
            title: 'Lesson 2.3: Balanced Trees & AVL Rotations',
            durationMinutes: 45,
            completed: false,
            keyConcepts: ['Balance factor $h_L - h_R$', 'Single Rotations (LL, RR)', 'Double Rotations (LR, RL)'],
            groundingSources: ['CLRS Chapter 13.1'],
            content: `To prevent degenerate $O(N)$ tree heights, AVL trees enforce that the heights of left and right subtrees differ by at most 1 at every node. Rotations restore balance in $O(1)$ time.`
          }
        ]
      },
      {
        id: 'm3',
        title: 'Module 3: Graph Traversal Algorithms',
        description: 'Breadth-First Search, Depth-First Search, and Shortest Paths.',
        lessons: [
          {
            id: 'les-301',
            title: 'Lesson 3.1: Breadth-First Search (BFS)',
            durationMinutes: 40,
            completed: false,
            keyConcepts: ['Queue FIFO', 'Level-by-level traversal', 'Shortest path in unweighted graph'],
            groundingSources: ['CLRS Chapter 22.2', 'Graph Reference PDF'],
            content: `BFS explores graph vertices level by level starting from a source $s$. It uses a Queue to maintain frontier nodes and guarantees finding the shortest path in unweighted graphs in $O(V + E)$ time.`
          },
          {
            id: 'les-302',
            title: 'Lesson 3.2: Depth-First Search (DFS) & Topological Sorting',
            durationMinutes: 45,
            completed: false,
            keyConcepts: ['Call Stack', 'Backtracking', 'Discovery/Finishing times'],
            groundingSources: ['CLRS Chapter 22.3'],
            content: `DFS explores deep along each branch before backtracking. It assigns discovery and finishing timestamps used in topological sorting of Directed Acyclic Graphs (DAGs).`
          }
        ]
      }
    ]
  },
  {
    id: 'cs305',
    code: 'CS305',
    title: 'Artificial Intelligence & Machine Learning',
    instructor: 'Dr. Marcus Vance',
    department: 'Computer Science',
    description: 'State space search, gradient descent optimization, transformer neural architectures, and RAG multi-agent design.',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    enrolledStudentsCount: 98,
    progressPercent: 42,
    strongTopics: ['Supervised Classification', 'Loss Functions'],
    weakTopics: ['A* Heuristic Admissibility', 'Self-Attention Mechanism'],
    knowledgeBase: [
      {
        id: 'kb-aima',
        title: 'Artificial Intelligence: A Modern Approach (AIMA 4th Ed)',
        type: 'textbook',
        pagesOrSize: '1120 pages',
        sourceName: 'Pearson Education',
        uploadedAt: '2026-01-08',
        summary: 'Comprehensive AI textbook covering state search, logic, machine learning, and multi-agent coordination.',
        snippet: 'Chapter 3: Informed search algorithms use domain-specific hints called heuristics $h(n)$ to find optimal paths.'
      },
      {
        id: 'kb-transformer-deck',
        title: 'Attention Is All You Need & Transformer Architectures',
        type: 'slides',
        pagesOrSize: '55 slides',
        sourceName: 'Dr. Vance Lecture Series',
        uploadedAt: '2026-02-02',
        summary: 'Slides detailing Scaled Dot-Product Attention, Multi-Head Attention, and Positional Encodings.',
        snippet: 'Attention formula: Attention(Q, K, V) = softmax(Q * K^T / sqrt(d_k)) * V'
      }
    ],
    modules: [
      {
        id: 'm305-1',
        title: 'Module 1: Heuristic Search & Optimizations',
        description: 'A* Search, admissibility, consistency, and Minimax.',
        lessons: [
          {
            id: 'les-305-101',
            title: 'Lesson 1.1: A* Search & Admissible Heuristics',
            durationMinutes: 35,
            completed: true,
            keyConcepts: ['$f(n) = g(n) + h(n)$', 'Admissibility $h(n) <= h*(n)$', 'Consistency'],
            groundingSources: ['AIMA Chapter 3.5'],
            content: `A* search evaluates nodes by combining cost to reach node $g(n)$ and estimated cost to goal $h(n)$. If $h(n)$ never overestimates, A* is guaranteed optimal.`
          }
        ]
      },
      {
        id: 'm305-2',
        title: 'Module 2: Neural Networks & Transformers',
        description: 'Backpropagation, self-attention mechanisms, and language models.',
        lessons: [
          {
            id: 'les-305-201',
            title: 'Lesson 2.1: Self-Attention & Query-Key-Value Matrices',
            durationMinutes: 50,
            completed: false,
            keyConcepts: ['Query, Key, Value vectors', 'Scaling factor $\\sqrt{d_k}$', 'Multi-Head Attention'],
            groundingSources: ['Transformer Deck Slide 12-30'],
            content: `Self-attention allows tokens in a sequence to dynamically weigh representations of all other tokens based on inner products of Queries and Keys.`
          }
        ]
      }
    ]
  },
  {
    id: 'bio110',
    code: 'BIO110',
    title: 'Molecular Cell Biology',
    instructor: 'Dr. Aris Thorne',
    department: 'Biological Sciences',
    description: 'Cellular respiration, membrane transport, DNA transcription/translation, and CRISPR gene editing technology.',
    thumbnail: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80',
    enrolledStudentsCount: 210,
    progressPercent: 20,
    strongTopics: ['Cell Membrane Structure'],
    weakTopics: ['Translation & Ribosome Synthesis', 'ATP Synthase Mechanism'],
    knowledgeBase: [
      {
        id: 'kb-bio-textbook',
        title: 'Molecular Biology of the Cell (6th Ed)',
        type: 'textbook',
        pagesOrSize: '1340 pages',
        sourceName: 'Garland Science',
        uploadedAt: '2026-01-05',
        summary: 'Standard molecular biology reference on organelles, signal transduction, and genetics.',
        snippet: 'Chapter 14: Mitochondria generate ATP through oxidative phosphorylation using a proton gradient across the inner membrane.'
      }
    ],
    modules: [
      {
        id: 'mbio-1',
        title: 'Module 1: Cellular Energetics',
        description: 'Glycolysis, Krebs cycle, and ATP Synthase.',
        lessons: [
          {
            id: 'les-bio-101',
            title: 'Lesson 1.1: Oxidative Phosphorylation & Chemiosmosis',
            durationMinutes: 40,
            completed: false,
            keyConcepts: ['Electron Transport Chain', 'Proton Motive Force', 'ATP Synthase F0/F1 units'],
            groundingSources: ['Molecular Biology Chapter 14'],
            content: `Electrons passed along the inner mitochondrial membrane pump $H^+$ ions into the intermembrane space. The flow back through ATP Synthase rotates the gamma subunit to generate ATP.`
          }
        ]
      }
    ]
  }
];

export const INITIAL_ASSIGNMENTS: Assignment[] = [
  {
    id: 'asg-1',
    courseId: 'cs201',
    courseTitle: 'CS201 Data Structures & Algorithms',
    title: 'Assignment 3: Tree Traversals & BFS Shortest Path Implementation',
    description: 'Implement recursive and iterative DFS tree traversals, as well as a queue-based BFS algorithm to find the shortest path in an unweighted grid.',
    dueDate: '2026-08-15',
    status: 'evaluated',
    submissionText: `def in_order_traversal(root):
    res = []
    def helper(node):
        if not node:
            return
        helper(node.left)
        res.append(node.val)
        helper(node.right)
    helper(root)
    return res

def bfs_shortest_path(graph, start, goal):
    queue = [(start, [start])]
    visited = {start}
    while queue:
        curr, path = queue.pop(0)
        if curr == goal:
            return path
        for neighbor in graph.get(curr, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, path + [neighbor]))
    return None`,
    evaluation: {
      id: 'eval-101',
      submissionId: 'asg-1',
      courseId: 'cs201',
      assignmentTitle: 'Assignment 3: Tree Traversals & BFS Shortest Path Implementation',
      submittedAt: '2026-08-08 14:32',
      overallScorePercent: 88,
      gradeLetter: 'A-',
      executiveSummary: 'Excellent Python implementation of In-Order Tree Traversal and BFS grid search! Your queue state handling accurately guarantees the shortest path property as outlined in CLRS Chapter 22.2. Minor efficiency gains possible by using collections.deque instead of list.pop(0).',
      strongTopics: ['Binary Search Tree Traversal', 'BFS Queue Frontier Handling', 'Shortest Path Guarantee'],
      weakTopics: ['Breadth-First Search Time Complexity (Queue Pop O(N))', 'Depth-First Search Non-recursive Stack implementation'],
      detailedQuestions: [
        {
          questionId: 'q1',
          questionText: 'Implement recursive in-order tree traversal returning a sorted array for a BST.',
          userAnswer: 'Used helper function with left -> root -> right recursive sequence.',
          isCorrect: true,
          pointsEarned: 50,
          maxPoints: 50,
          feedback: 'Perfect! Traversal order adheres strictly to the BST invariant in Week 4 Lecture Slides (Slide 18).',
          conceptCovered: 'In-order Traversal'
        },
        {
          questionId: 'q2',
          questionText: 'Implement Queue-based BFS and explain its time complexity with graph parameters V and E.',
          userAnswer: 'Used list.pop(0) in Python while loop.',
          isCorrect: false,
          pointsEarned: 38,
          maxPoints: 50,
          feedback: 'Algorithm functionality is correct, but using Python list.pop(0) causes O(V) array shifting per step, turning overall BFS runtime into O(V^2 + E) instead of optimal O(V + E). Use collections.deque.popleft() for O(1) pops.',
          conceptCovered: 'BFS Complexity & Deque Optimizations'
        }
      ],
      recommendedNextSteps: [
        {
          action: 'Practice exercise set on BFS vs DFS Queue & Stack optimizations',
          targetTopic: 'Breadth-First Search (BFS)',
          exerciseTopic: 'BFS Queue Optimizations'
        },
        {
          action: 'Review Lesson 3.2: Depth-First Search (DFS)',
          targetTopic: 'Depth-First Search (DFS)',
          lessonId: 'les-302'
        }
      ]
    }
  },
  {
    id: 'asg-2',
    courseId: 'cs201',
    courseTitle: 'CS201 Data Structures & Algorithms',
    title: 'Assignment 4: Graph Cycle Detection & Topological Sort',
    description: 'Construct a DAG topological sorter using Kahn\'s algorithm or DFS finishing order.',
    dueDate: '2026-08-22',
    status: 'pending'
  },
  {
    id: 'asg-3',
    courseId: 'cs305',
    courseTitle: 'CS305 AI & Machine Learning',
    title: 'Problem Set 2: A* Admissible Heuristic Proofs',
    description: 'Prove mathematically that Manhattan distance is admissible for grid pathfinding with 4-directional movement.',
    dueDate: '2026-08-18',
    status: 'pending'
  }
];

export const INITIAL_TOPIC_MASTERY: TopicMastery[] = [
  { topic: 'Binary Search Trees', courseId: 'cs201', masteryPercent: 92, status: 'mastered', lastPracticed: '2026-08-07', attemptsCount: 14 },
  { topic: 'Big-O Complexity', courseId: 'cs201', masteryPercent: 88, status: 'mastered', lastPracticed: '2026-08-05', attemptsCount: 18 },
  { topic: 'In-order Traversal', courseId: 'cs201', masteryPercent: 85, status: 'mastered', lastPracticed: '2026-08-08', attemptsCount: 9 },
  { topic: 'Depth-First Search (DFS)', courseId: 'cs201', masteryPercent: 54, status: 'needs_review', lastPracticed: '2026-08-02', attemptsCount: 6 },
  { topic: 'Breadth-First Search (BFS)', courseId: 'cs201', masteryPercent: 61, status: 'needs_review', lastPracticed: '2026-08-08', attemptsCount: 8 },
  { topic: 'AVL Tree Rotations', courseId: 'cs201', masteryPercent: 42, status: 'needs_review', lastPracticed: '2026-07-28', attemptsCount: 4 },
  { topic: 'A* Heuristic Admissibility', courseId: 'cs305', masteryPercent: 58, status: 'developing', lastPracticed: '2026-08-04', attemptsCount: 5 },
  { topic: 'Self-Attention Mechanism', courseId: 'cs305', masteryPercent: 35, status: 'needs_review', lastPracticed: '2026-08-01', attemptsCount: 3 }
];

export const INITIAL_EXERCISE_SETS: ExerciseSet[] = [
  {
    id: 'ex-1',
    title: 'Personalized Practice: Tree Traversals & DFS/BFS',
    courseId: 'cs201',
    courseName: 'CS201 Data Structures & Algorithms',
    topic: 'Depth-First Search (DFS) & Tree Traversal',
    createdAt: '2026-08-08',
    questions: [
      {
        id: 'q101',
        type: 'mcq',
        topic: 'Tree Traversal',
        difficulty: 'easy',
        question: 'Which tree traversal order will output keys of a Binary Search Tree in sorted ascending numerical order?',
        options: ['A) Pre-order (Root, Left, Right)', 'B) In-order (Left, Root, Right)', 'C) Post-order (Left, Right, Root)', 'D) Level-order (BFS)'],
        correctAnswer: 'B) In-order (Left, Root, Right)',
        explanation: 'According to Slide 18 of Week 4 Lecture Slides, in-order traversal visits left subtree (all smaller keys), root node, then right subtree (all larger keys), which naturally produces a sorted sequence for any BST.'
      },
      {
        id: 'q102',
        type: 'mcq',
        topic: 'BFS vs DFS',
        difficulty: 'medium',
        question: 'When finding the shortest path in an unweighted graph, why is BFS preferred over DFS?',
        options: [
          'A) BFS uses less memory than DFS in wide trees',
          'B) BFS explores nodes level by level, guaranteeing that the first time a goal node is reached, it is via the minimum number of edges',
          'C) DFS always gets trapped in cycles',
          'D) BFS has O(1) time complexity'
        ],
        correctAnswer: 'B) BFS explores nodes level by level, guaranteeing that the first time a goal node is reached, it is via the minimum number of edges',
        explanation: 'As stated in CLRS Chapter 22.2, BFS expands the frontier uniformly outward in distance order. The first time the destination node is dequeued, the path length is guaranteed minimal.'
      },
      {
        id: 'q103',
        type: 'short_answer',
        topic: 'Queue Optimizations',
        difficulty: 'medium',
        question: 'What Python data structure from the standard library should be used for the BFS queue, and why is `list.pop(0)` inefficient?',
        explanation: '`collections.deque` provides $O(1)$ amortized `popleft()` operations. In contrast, `list.pop(0)` shifts all remaining $N-1$ elements in memory, yielding $O(N)$ per pop.'
      }
    ]
  }
];

export const INITIAL_ACTIVITIES: ActivityLog[] = [
  {
    id: 'act-1',
    timestamp: '10 minutes ago',
    type: 'assignment_submitted',
    title: 'Assignment 3 Evaluated by AI Evaluation Agent',
    description: 'Score received: 88% (A-). Strengths in BST invariants; recommendation to optimize BFS deque popping.',
    courseCode: 'CS201',
    score: 88
  },
  {
    id: 'act-2',
    timestamp: '2 hours ago',
    type: 'asked_tutor',
    title: 'Teaching Agent Consultation',
    description: 'Asked for step-by-step O(log N) proof for BST search using CLRS 4th Ed Chapter 12.',
    courseCode: 'CS201'
  },
  {
    id: 'act-3',
    timestamp: 'Yesterday',
    type: 'exercise_done',
    title: 'Completed Generated Practice Set',
    description: 'Practiced 5 questions on In-order Traversal & BST insertion.',
    courseCode: 'CS201',
    score: 100
  },
  {
    id: 'act-4',
    timestamp: '3 days ago',
    type: 'lesson_read',
    title: 'Completed Lesson 2.1: BST Invariants',
    description: 'Studied lecture notes and slide deck on BST left/right child invariants.',
    courseCode: 'CS201'
  }
];
