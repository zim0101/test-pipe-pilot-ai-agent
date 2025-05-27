pipeline {
    agent any

    environment {
        NODE_VERSION = '18'
        DOCKER_REGISTRY = 'docker.io'
        PROJECT_NAME = 'solar-system'
        GITHUB_REPO = 'https://github.com/zim0101/test-pipe-pilot-ai-agent'
    }

    parameters {
        choice(name: 'DEPLOY_ENV', choices: ['development', 'staging', 'production'], description: 'Deploy environment')
        string(name: 'BRANCH', defaultValue: 'main', description: 'Branch to build')
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: "${params.BRANCH}", 
                    url: "${GITHUB_REPO}", 
                    credentialsId: 'github-credentials'
            }
        }

        stage('Setup Node') {
            steps {
                nodejs(nodeJSInstallationName: "Node ${NODE_VERSION}") {
                    sh 'npm install'
                    sh 'npm cache clean --force'
                }
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint || true'
            }
        }

        stage('Unit Test') {
            steps {
                sh 'npm test'
                junit 'test-results.xml'
            }
        }

        stage('Security Scan') {
            steps {
                sh 'npm audit --audit-level=high'
                sh 'npx snyk test || true'
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    docker.build("${PROJECT_NAME}:${env.BUILD_NUMBER}")
                }
            }
        }

        stage('Deploy') {
            when {
                expression { params.DEPLOY_ENV == 'production' }
            }
            steps {
                script {
                    docker.withRegistry("https://${DOCKER_REGISTRY}", 'docker-hub-credentials') {
                        docker.image("${PROJECT_NAME}:${env.BUILD_NUMBER}").push('latest')
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully!'
            slackSend(
                color: 'good', 
                message: "Build ${env.BUILD_NUMBER} succeeded for ${PROJECT_NAME}"
            )
        }
        failure {
            echo 'Pipeline failed!'
            slackSend(
                color: 'danger', 
                message: "Build ${env.BUILD_NUMBER} failed for ${PROJECT_NAME}"
            )
        }
        always {
            cleanWs()
            deleteDir()
        }
    }
}