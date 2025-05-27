pipeline {
    agent any
    
    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['dev', 'staging', 'prod'],
            description: 'Target environment for deployment'
        )
        booleanParam(
            name: 'SKIP_TESTS',
            defaultValue: false,
            description: 'Skip test execution'
        )
        booleanParam(
            name: 'BUILD_DOCKER_IMAGE',
            defaultValue: true,
            description: 'Build Docker image'
        )
    }
    
    environment {
        NODE_VERSION = '18'
        APP_NAME = 'solar-system'
        DOCKER_REGISTRY = 'your-registry.com'
        DOCKER_IMAGE = "${DOCKER_REGISTRY}/${APP_NAME}"
        MONGO_URI = credentials('mongo-uri')
        MONGO_USERNAME = credentials('mongo-username')
        MONGO_PASSWORD = credentials('mongo-password')
        SONAR_TOKEN = credentials('sonar-token')
        SLACK_WEBHOOK = credentials('slack-webhook')
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
        skipDefaultCheckout()
    }
    
    stages {
        stage('Checkout') {
            steps {
                script {
                    checkout scm
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    env.BUILD_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT_SHORT}"
                }
            }
        }
        
        stage('Setup Node.js') {
            steps {
                script {
                    def nodeHome = tool name: 'NodeJS-18', type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'
                    env.PATH = "${nodeHome}/bin:${env.PATH}"
                }
                sh 'node --version'
                sh 'npm --version'
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh 'npm ci --only=production'
                sh 'npm ci --only=dev'
            }
            post {
                success {
                    echo 'Dependencies installed successfully'
                }
                failure {
                    echo 'Failed to install dependencies'
                }
            }
        }
        
        stage('Lint & Code Quality') {
            parallel {
                stage('ESLint') {
                    when {
                        not { params.SKIP_TESTS }
                    }
                    steps {
                        script {
                            try {
                                sh 'npm run lint || true'
                            } catch (Exception e) {
                                echo "Linting completed with warnings: ${e.getMessage()}"
                            }
                        }
                    }
                }
                stage('Security Audit') {
                    steps {
                        sh 'npm audit --audit-level moderate || true'
                    }
                }
            }
        }
        
        stage('Unit Tests') {
            when {
                not { params.SKIP_TESTS }
            }
            steps {
                sh 'npm test'
            }
            post {
                always {
                    script {
                        if (fileExists('test-results.xml')) {
                            publishTestResults testResultsPattern: 'test-results.xml'
                        }
                        if (fileExists('coverage/lcov.info')) {
                            publishCoverage adapters: [lcovAdapter('coverage/lcov.info')], sourceFileResolver: sourceFiles('STORE_LAST_BUILD')
                        }
                    }
                }
            }
        }
        
        stage('SonarQube Analysis') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    changeRequest()
                }
            }
            steps {
                script {
                    def scannerHome = tool 'SonarQubeScanner'
                    withSonarQubeEnv('SonarQube') {
                        sh """
                            ${scannerHome}/bin/sonar-scanner \
                            -Dsonar.projectKey=${APP_NAME} \
                            -Dsonar.projectName='${APP_NAME}' \
                            -Dsonar.projectVersion=${BUILD_TAG} \
                            -Dsonar.sources=. \
                            -Dsonar.exclusions=node_modules/**,coverage/** \
                            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                        """
                    }
                }
            }
        }
        
        stage('Quality Gate') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    changeRequest()
                }
            }
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
        
        stage('Build Docker Image') {
            when {
                allOf {
                    params.BUILD_DOCKER_IMAGE
                    anyOf {
                        branch 'main'
                        branch 'develop'
                        params.ENVIRONMENT != 'dev'
                    }
                }
            }
            steps {
                script {
                    def dockerImage = docker.build("${DOCKER_IMAGE}:${BUILD_TAG}")
                    docker.withRegistry("https://${DOCKER_REGISTRY}", 'docker-registry-credentials') {
                        dockerImage.push()
                        dockerImage.push('latest')
                    }
                    env.DOCKER_IMAGE_TAG = "${DOCKER_IMAGE}:${BUILD_TAG}"
                }
            }
        }
        
        stage('Integration Tests') {
            when {
                allOf {
                    not { params.SKIP_TESTS }
                    params.BUILD_DOCKER_IMAGE
                }
            }
            steps {
                script {
                    sh '''
                        docker-compose -f docker-compose.yml -f docker-compose.test.yml up -d mongodb
                        sleep 10
                        docker-compose -f docker-compose.yml -f docker-compose.test.yml run --rm app npm run test:integration || true
                        docker-compose -f docker-compose.yml -f docker-compose.test.yml down -v
                    '''
                }
            }
        }
        
        stage('Deploy to Environment') {
            when {
                anyOf {
                    allOf {
                        branch 'main'
                        params.ENVIRONMENT == 'prod'
                    }
                    allOf {
                        branch 'develop'
                        params.ENVIRONMENT == 'staging'
                    }
                    params.ENVIRONMENT == 'dev'
                }
            }
            steps {
                script {
                    echo "Deploying to ${params.ENVIRONMENT} environment"
                    
                    if (params.ENVIRONMENT == 'prod') {
                        input message: 'Deploy to Production?', ok: 'Deploy',
                              submitterParameter: 'DEPLOYER'
                    }
                    
                    withCredentials([
                        string(credentialsId: "${params.ENVIRONMENT}-mongo-uri", variable: 'DEPLOY_MONGO_URI'),
                        usernamePassword(credentialsId: "${params.ENVIRONMENT}-mongo-creds", 
                                       usernameVariable: 'DEPLOY_MONGO_USERNAME', 
                                       passwordVariable: 'DEPLOY_MONGO_PASSWORD')
                    ]) {
                        sh """
                            echo "Deploying ${DOCKER_IMAGE_TAG} to ${params.ENVIRONMENT}"
                            # Add your deployment commands here
                            # kubectl set image deployment/${APP_NAME} ${APP_NAME}=${DOCKER_IMAGE_TAG}
                            # helm upgrade ${APP_NAME} ./helm-chart --set image.tag=${BUILD_TAG}
                        """
                    }
                }
            }
        }
        
        stage('Smoke Tests') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                script {
                    sleep 30
                    sh '''
                        # Add smoke test commands
                        curl -f http://localhost:3001/health || exit 1
                        echo "Smoke tests passed"
                    '''
                }
            }
        }
    }
    
    post {
        always {
            script {
                sh 'docker system prune -f || true'
                sh 'docker-compose down -v || true'
            }
            cleanWs()
        }
        success {
            script {
                if (env.BRANCH_NAME == 'main' || env.BRANCH_NAME == 'develop') {
                    slackSend(
                        channel: '#deployments',
                        color: 'good',
                        message: """
                            ✅ *SUCCESS*: ${env.JOB_NAME} - ${env.BUILD_NUMBER}
                            *Branch*: ${env.BRANCH_NAME}
                            *Environment*: ${params.ENVIRONMENT}
                            *Commit*: ${env.GIT_COMMIT_SHORT}
                            *Duration*: ${currentBuild.durationString}
                        """.stripIndent()
                    )
                }
            }
        }
        failure {
            script {
                slackSend(
                    channel: '#alerts',
                    color: 'danger',
                    message: """
                        ❌ *FAILED*: ${env.JOB_NAME} - ${env.BUILD_NUMBER}
                        *Branch*: ${env.BRANCH_NAME}
                        *Environment*: ${params.ENVIRONMENT}
                        *Commit*: ${env.GIT_COMMIT_SHORT}
                        *Duration*: ${currentBuild.durationString}
                        *Console*: ${env.BUILD_URL}console
                    """.stripIndent()
                )
            }
            emailext(
                subject: "Build Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                body: """
                    Build failed for ${env.JOB_NAME} - ${env.BUILD_NUMBER}
                    
                    Branch: ${env.BRANCH_NAME}
                    Commit: ${env.GIT_COMMIT_SHORT}
                    
                    Check console output: ${env.BUILD_URL}console
                """,
                to: "${env.CHANGE_AUTHOR_EMAIL ?: 'dev-team@company.com'}"
            )
        }
        unstable {
            script {
                slackSend(
                    channel: '#alerts',
                    color: 'warning',
                    message: """
                        ⚠️ *UNSTABLE*: ${env.JOB_NAME} - ${env.BUILD_NUMBER}
                        *Branch*: ${env.BRANCH_NAME}
                        *Environment*: ${params.ENVIRONMENT}
                        *Commit*: ${env.GIT_COMMIT_SHORT}
                    """.stripIndent()
                )
            }
        }
    }
}