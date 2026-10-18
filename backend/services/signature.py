"""
Turns a LeetCode Python signature into:
starter code (py/cpp/java)
and generic stdin->stdout harnesses.

Protocol:
each argument is one line of JSON on stdin;
the program prints <<RESULT>>{json} on stdout.
"""

import re
from typing import Any, Dict, List


MARK = "<<RESULT>>"

SUPPORTED = {
    "int",
    "float",
    "str",
    "bool",
    "List[int]",
    "List[str]",
    "List[float]",
    "List[List[int]]",
    "List[List[str]]",
}


class Unsupported(Exception):
    pass


def _split_top(s: str) -> List[str]:
    out, depth, cur = [], 0, ""

    for ch in s:
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1

        if ch == "," and depth == 0:
            out.append(cur)
            cur = ""
        else:
            cur += ch

    if cur.strip():
        out.append(cur)

    return [x.strip() for x in out]


def parse_python_snippet(snippet: str) -> Dict[str, Any]:
    if "__init__" in snippet:
        raise Unsupported("class-design problem")

    m = re.search(
        r"def\s+(\w+)\s*\(\s*self\s*,?\s*(.*?)\)\s*->\s*([^:]+):",
        snippet,
        re.S,
    )

    if not m:
        raise Unsupported("no function signature (in-place / void problem)")

    fn, raw, ret = (
        m.group(1),
        m.group(2),
        re.sub(r"\s+", "", m.group(3)),
    )

    params = []

    for p in _split_top(raw):
        name, _, typ = p.partition(":")
        typ = re.sub(r"\s+", "", typ)

        if typ not in SUPPORTED:
            raise Unsupported(f"parameter type {typ!r}")

        params.append({
            "name": name.strip(),
            "type": typ,
        })

    if not params:
        raise Unsupported("no parameters")

    if ret not in SUPPORTED:
        raise Unsupported(f"return type {ret!r}")

    return {
        "function_name": fn,
        "params": params,
        "return_type": ret,
    }


# ------------------------------------------------------------------
# Starter code

CPP_T = {
    "int": "int",
    "float": "double",
    "str": "string",
    "bool": "bool",
    "List[int]": "vector<int>",
    "List[str]": "vector<string>",
    "List[float]": "vector<double>",
    "List[List[int]]": "vector<vector<int>>",
    "List[List[str]]": "vector<vector<string>>",
}

CPP_DEFAULT = {
    "int": "0",
    "float": "0.0",
    "str": '""',
    "bool": "false",
}

JAVA_T = {
    "int": "int",
    "float": "double",
    "str": "String",
    "bool": "boolean",
    "List[int]": "int[]",
    "List[str]": "String[]",
    "List[float]": "double[]",
    "List[List[int]]": "int[][]",
    "List[List[str]]": "String[][]",
}

JAVA_DEFAULT = {
    "int": "0",
    "float": "0.0",
    "str": '""',
    "bool": "false",
}

JAVA_CONV = {
    "int": "toInt",
    "float": "toDbl",
    "str": "toStr",
    "bool": "toBool",
    "List[int]": "toIntA",
    "List[str]": "toStrA",
    "List[float]": "toDblA",
    "List[List[int]]": "toIntAA",
    "List[List[str]]": "toStrAA",
}


def starter_code(spec: Dict[str, Any]) -> Dict[str, str]:
    fn, ps, rt = (
        spec["function_name"],
        spec["params"],
        spec["return_type"],
    )

    py_params = ", ".join(
        f"{p['name']}: {p['type']}"
        for p in ps
    )

    cpp_params = ", ".join(
        f"{CPP_T[p['type']]}"
        f"{'&' if p['type'].startswith('List') else ''} "
        f"{p['name']}"
        for p in ps
    )

    java_params = ", ".join(
        f"{JAVA_T[p['type']]} {p['name']}"
        for p in ps
    )

    return {
        "python": f"""from typing import List

class Solution:
    def {fn}(self, {py_params}) -> {rt}:
        # Write your code here
        pass
""",

        "cpp": (
            f"""// <bits/stdc++.h> is included for you
class Solution {{
public:
    {CPP_T[rt]} {fn}({cpp_params}) {{
        // Write your code here
"""
            f"""        return {CPP_DEFAULT.get(rt, '{}')};
    }}
}};
"""
        ),

        "java": (
            f"""// java.util.* is imported for you
class Solution {{
    public {JAVA_T[rt]} {fn}({java_params}) {{
        // Write your code here
"""
            f"""        return {JAVA_DEFAULT.get(rt, 'null')};
    }}
}}
"""
        ),
    }


# ------------------------------------------------------------------
# Harnesses

def _py(user: str, spec: Dict[str, Any]) -> str:
    return f'''from typing import *
import sys
import json

{user}

if __name__ == "__main__":
    _lines = [
        l for l in sys.stdin.read().split("\\n")
        if l.strip()
    ]

    _args = [
        json.loads(l)
        for l in _lines
    ]

    _res = getattr(
        Solution(),
        "{spec["function_name"]}"
    )(*_args)

    sys.stdout.flush()

    print(
        "{MARK}" + json.dumps(_res)
    )
'''


CPP_HELPERS = r'''
#include <bits/stdc++.h>
using namespace std;

static void ws_(const string&s,size_t&i){
    while(i<s.size()&&isspace((unsigned char)s[i]))i++;
}

static void rd(
    const string&s,
    size_t&i,
    long long&v
){
    ws_(s,i);
    size_t j=i;

    if(s[i]=='-'||s[i]=='+')i++;

    while(
        i<s.size() &&
        isdigit((unsigned char)s[i])
    )i++;

    v=stoll(s.substr(j,i-j));
}

static void rd(
    const string&s,
    size_t&i,
    int&v
){
    long long t;
    rd(s,i,t);
    v=(int)t;
}

static void rd(
    const string&s,
    size_t&i,
    double&v
){
    ws_(s,i);
    size_t j=i;

    while(
        i<s.size() &&
        (
            isdigit((unsigned char)s[i]) ||
            strchr("+-.eE",s[i])
        )
    )i++;

    v=stod(s.substr(j,i-j));
}

static void rd(
    const string&s,
    size_t&i,
    bool&v
){
    ws_(s,i);

    if(s.compare(i,4,"true")==0){
        v=true;
        i+=4;
    }else{
        v=false;
        i+=5;
    }
}

static void rd(
    const string&s,
    size_t&i,
    string&v
){
    ws_(s,i);
    v.clear();
    i++;

    while(s[i]!='"'){
        if(s[i]=='\\'){
            i++;
            char c=s[i];

            v+=(c=='n')?'\n':
               (c=='t')?'\t':c;
        }else{
            v+=s[i];
        }

        i++;
    }

    i++;
}

template<class T>
static void rd(
    const string&s,
    size_t&i,
    vector<T>&v
){
    ws_(s,i);
    v.clear();
    i++;

    ws_(s,i);

    if(s[i]==']'){
        i++;
        return;
    }

    while(true){
        T x;
        rd(s,i,x);
        v.push_back(x);

        ws_(s,i);

        if(s[i]==','){
            i++;
            continue;
        }

        i++;
        break;
    }
}

static string js(int v){
    return to_string(v);
}

static string js(long long v){
    return to_string(v);
}

static string js(double v){
    ostringstream o;
    o<<setprecision(15)<<v;
    return o.str();
}

static string js(bool v){
    return v?"true":"false";
}

static string js(const string&v){
    string r="\"";

    for(char c:v){
        if(c=='"'||c=='\\')
            r+='\\';

        r+=c;
    }

    return r+"\"";
}

template<class T>
static string js(const vector<T>&v){
    string r="[";

    for(size_t k=0;k<v.size();k++){
        if(k)r+=",";
        r+=js(v[k]);
    }

    return r+"]";
}
'''


def _cpp(
    user: str,
    spec: Dict[str, Any]
) -> str:

    ps = spec["params"]

    decls = "\n".join(
        f"""    {CPP_T[p['type']]} a{i};
    {{ size_t k=0; rd(L[{i}],k,a{i}); }}"""
        for i, p in enumerate(ps)
    )

    call = ", ".join(
        f"a{i}"
        for i in range(len(ps))
    )

    return (
        CPP_HELPERS
        + "\n"
        + user
        + f'''
int main(){{
    string l;
    vector<string> L;

    while(getline(cin,l)){{
        if(!l.empty()&&l.back()=='\\r')
            l.pop_back();

        if(!l.empty())
            L.push_back(l);
    }}

    if(L.size()<{len(ps)})
        return 3;

{decls}

    Solution sol;

    auto r = sol.{spec["function_name"]}({call});

    cout << "{MARK}" << js(r) << endl;

    return 0;
}}
'''
    )


JAVA_HELPERS = r'''
public class Main {

    static String s;
    static int p;

    static void ws(){
        while(
            p<s.length() &&
            Character.isWhitespace(s.charAt(p))
        )p++;
    }

    static Object val(){

        ws();

        char c=s.charAt(p);

        if(c=='['){

            p++;

            List<Object> l=new ArrayList<>();

            ws();

            if(s.charAt(p)==']'){
                p++;
                return l;
            }

            while(true){

                l.add(val());

                ws();

                if(s.charAt(p)==','){
                    p++;
                    continue;
                }

                p++;

                return l;
            }
        }

        if(c=='"'){

            p++;

            StringBuilder b=new StringBuilder();

            while(s.charAt(p)!='"'){

                if(s.charAt(p)=='\\'){
                    p++;

                    char e=s.charAt(p);

                    b.append(
                        e=='n'?'\n':
                        e=='t'?'\t':e
                    );

                }else{
                    b.append(s.charAt(p));
                }

                p++;
            }

            p++;

            return b.toString();
        }

        if(s.startsWith("true",p)){
            p+=4;
            return Boolean.TRUE;
        }

        if(s.startsWith("false",p)){
            p+=5;
            return Boolean.FALSE;
        }

        int j=p;

        while(
            p<s.length() &&
            "+-.eE0123456789".indexOf(
                s.charAt(p)
            )>=0
        )p++;

        return Double.valueOf(
            s.substring(j,p)
        );
    }

    static int toInt(Object o){
        return ((Double)o).intValue();
    }

    static double toDbl(Object o){
        return (Double)o;
    }

    static String toStr(Object o){
        return (String)o;
    }

    static boolean toBool(Object o){
        return (Boolean)o;
    }

    static int[] toIntA(Object o){
        List<?> l=(List<?>)o;

        int[] r=new int[l.size()];

        for(int i=0;i<r.length;i++)
            r[i]=toInt(l.get(i));

        return r;
    }

    static double[] toDblA(Object o){
        List<?> l=(List<?>)o;

        double[] r=new double[l.size()];

        for(int i=0;i<r.length;i++)
            r[i]=toDbl(l.get(i));

        return r;
    }

    static String[] toStrA(Object o){
        List<?> l=(List<?>)o;

        String[] r=new String[l.size()];

        for(int i=0;i<r.length;i++)
            r[i]=(String)l.get(i);

        return r;
    }

    static int[][] toIntAA(Object o){
        List<?> l=(List<?>)o;

        int[][] r=new int[l.size()][];

        for(int i=0;i<r.length;i++)
            r[i]=toIntA(l.get(i));

        return r;
    }

    static String[][] toStrAA(Object o){
        List<?> l=(List<?>)o;

        String[][] r=new String[l.size()][];

        for(int i=0;i<r.length;i++)
            r[i]=toStrA(l.get(i));

        return r;
    }

    static String js(Object r){

        if(r==null)
            return "null";

        if(r instanceof String){

            String x=(String)r;

            return "\""
                +x.replace("\\","\\\\")
                   .replace("\"","\\\"")
                +"\"";
        }

        if(r instanceof int[]){

            int[] a=(int[])r;

            StringBuilder b=
                new StringBuilder("[");

            for(int i=0;i<a.length;i++){

                if(i>0)
                    b.append(",");

                b.append(a[i]);
            }

            return b.append("]").toString();
        }

        if(r instanceof double[]){

            double[] a=(double[])r;

            StringBuilder b=
                new StringBuilder("[");

            for(int i=0;i<a.length;i++){

                if(i>0)
                    b.append(",");

                b.append(a[i]);
            }

            return b.append("]").toString();
        }

        if(r instanceof Object[]){

            Object[] a=(Object[])r;

            StringBuilder b=
                new StringBuilder("[");

            for(int i=0;i<a.length;i++){

                if(i>0)
                    b.append(",");

                b.append(js(a[i]));
            }

            return b.append("]").toString();
        }

        return String.valueOf(r);
    }
}
'''


def _java(
    user: str,
    spec: Dict[str, Any]
) -> str:

    user = re.sub(
        r"public\s+class\s+Solution",
        "class Solution",
        user,
    )

    ps = spec["params"]

    decls = "\n".join(
        f"""    s=L.get({i});
    p=0;
    {JAVA_T[q['type']]} a{i}={JAVA_CONV[q['type']]}(val());"""
        for i, q in enumerate(ps)
    )

    call = ", ".join(
        f"a{i}"
        for i in range(len(ps))
    )

    return (
        "import java.util.*;\n"
        "import java.io.*;\n"
        + user
        + "\n"
        + JAVA_HELPERS
        + f'''
public static void main(String[] args)
        throws Exception {{

    BufferedReader br =
        new BufferedReader(
            new InputStreamReader(System.in)
        );

    List<String> L =
        new ArrayList<>();

    String line;

    while((line=br.readLine())!=null){{
        line=line.trim();

        if(!line.isEmpty())
            L.add(line);
    }}

{decls}

    Object r =
        new Solution().{spec["function_name"]}(
            {call}
        );

    System.out.println(
        "{MARK}" + js(r)
    );
}}

}}
'''
    )


def build_source(
    language: str,
    user_code: str,
    spec: Dict[str, Any]
) -> str:

    if language == "python":
        return _py(user_code, spec)

    if language == "cpp":
        return _cpp(user_code, spec)

    if language == "java":
        return _java(user_code, spec)

    raise ValueError(
        f"Unsupported language: {language}"
    )