'use strict';
const codeForExpresion =
  "(function(){const t = FUNCTION_CODE; t.asString = 'FUNCTION_CODE'; t._closure = CLOSURE; return t;})()";
const codeForDeclaration =
  "NAME.asString = 'FUNCTION_CODE'; NAME._closure = CLOSURE; ";

const functionHooks = {
  useAnimatedStyle: true,
  useAnimatedProps: true,
  useDerivedValue: true,
};

const objectHooks = {
  useAnimatedGestureHandler: true,
};

const globals = [
  'this',
  'Reanimated',
  'Date',
  'Array',
  'ArrayBuffer',
  'Date',
  'HermesInternal',
  'JSON',
  'Math',
  'Number',
  'Object',
  'String',
  'Extrapolate',
  'console',
  'undefined',
  'null',
];

function processWorkletFunction(t, fun) {
  const variables = [];
  // Experimental Start

  const funScope = fun.scope;

  fun.traverse({
    Identifier(path) {
      const name = path.node.name;
      if (globals.includes(name)) {
        return;
      }

      const parentNode = path.parent;

      if (
        parentNode.type === 'MemberExpression' &&
        parentNode.object !== path.node
      ) {
        return;
      }

      if (
        parentNode.type === 'ObjectProperty' &&
        path.parentPath.parent.type === 'ObjectExpression' &&
        path.node !== parentNode.value
      ) {
        return;
      }

      let currentScope = path.scope;

      while (true) {
        if (currentScope.bindings[name] != null) {
          return;
        }
        if (currentScope === funScope) {
          break;
        }
        currentScope = currentScope.parent;
      }
      variables.push(path.node);
    },
  });

  const privateFunctionId = t.identifier('_f');

  const newFun = t.functionExpression(
    fun.identifier,
    [],
    t.blockStatement([
      t.variableDeclaration('const', [
        t.variableDeclarator(privateFunctionId, fun.node),
      ]),
      t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(
            privateFunctionId,
            t.identifier('asString'),
            false
          ),
          t.stringLiteral('hello' || fun.toString())
        )
      ),
      t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(
            privateFunctionId,
            t.identifier('_closure'),
            false
          ),
          t.objectExpression(
            variables.map((variable) =>
              t.objectProperty(variable, variable, false, true)
            )
          )
        )
      ),
      t.returnStatement(privateFunctionId),
    ])
  );

  fun.replaceWith(t.callExpression(newFun, []));
  fun.skip();
}

module.exports = function ({ types: t }) {
  return {
    visitor: {
      CallExpression(path) {
        const name = path.node.callee.name;
        if (name in functionHooks) {
          processWorkletFunction(t, path.get('arguments.0'));
        } else if (name in objectHooks) {
          const objectPath = path.get('arguments.0.properties.0');
          for (let i = 0; i < objectPath.container.length; i++) {
            processWorkletFunction(t, objectPath.getSibling(i).get('value'));
          }
        }
      },
      DirectiveLiteral(path) {
        const value = path.node.value;
        if (value === 'worklet' || value === 'workletwc') {
          const fun = path.getFunctionParent();
          console.log('FUN', fun);
          processWorkletFunction(t, fun);
        }
      },
    },
  };
};
