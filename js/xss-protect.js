!function(window){
    var accept = '*.1kapp.com;*.sina.com.cn;*.yunshangdian.com;www.sae.sinacdn.com;*.stor.sinaapp.com;*.sinaimg.cn;weibo.com;e.weibo.com;t.cn;www.1kapp.com;sinacloud.com;www.w3.org;*.sina.com;yunshangdian.com',
        tags = ['script','iframe','frame','img','link','a'],
        urlReg = /\s*(?:(?:https??\:)[\/\\]{2,})([^\/]+)/i;
    accept = accept.split(';');


    /*获取请求域*/
    function getDomain(url){
        var ol = url ? url.match(urlReg) : null;
        return ol === null ? '' : ol[1]
    }

    /*验证请求域*/
    function matchAccept(url){
        var i=0,l=accept.length,url=getDomain(url),tmp=url;
        if(url === '' || l==0){return true}
        for(;i<l;i++){
            var cro = accept[i].charAt(0),
                reg = accept[i].split('').reverse().join('');
                url = tmp;
            if(cro === '*'){
                reg = reg.substring(0,reg.length-1);
                url = url.split('').reverse().join('').substring(0,reg.length);
                if(reg === url){return true}
            }else{
                url = url.split('').reverse().join('');
                if(reg === url){return true}
            }
        }
        return false
    }

    /*获取标签名*/
    function getTag(name){
        var i=0,l=tags.length;
        for(;i<l;i++){
            var reg = new RegExp(tags[i],'i');
            if(reg.test(name)){return true}
        }
        return false
    }

    /*提示可疑模块*/
    function intercept(url){
        alert('阻止可疑请求: '+ url);
        console.warn('阻止可疑请求: '+ url);
    }

    function xssPro(window){
        /*过滤内联事件*/
        function stopOnEvent(onevent){
            document.addEventListener(onevent.substr(2),function(e){
                var element = e.target;
                var flags = element['xss_flag'];
                if(!flags){
                    flags = element['xss_flag'] = {};
                }
                if(typeof flags[onevent] != 'undefined'){
                    return;
                }
                flags[onevent] = true;

                if(element.nodeType != Node.ELEMENT_NODE){
                    return;
                }
                var code = element.getAttribute(onevent);
                if(code && !matchAccept(code)){
                    element[onevent] = null;
                    intercept(code);
                }
            }, true);
        }

        for (var k in document){
            if(/^on/.test(k)){
                stopOnEvent(k);
            }
        }



        /*在XMLHttpRequest.open中过滤url*/
        var raw_xhr_open_fn = window.XMLHttpRequest.prototype.open;
        window.XMLHttpRequest.prototype.open = function(method , url){
            if(!matchAccept(url)){
                intercept(url);
            }else{
                raw_xhr_open_fn.apply(this,arguments);
            }
        }

        /*在setAttribute上检验需要过滤的url*/
        var raw_set_fn = window.Element.prototype.setAttribute;
        window.Element.prototype.setAttribute = function(name, value){
            // 额外细节实现
            if (getTag(this.tagName) && (/^src$/i.test(name) || /^href$/i.test(name))){
                if (!matchAccept(value)){
                    intercept(value);
                }else{
                    raw_set_fn.apply(this, arguments);
                }
            }
        }

        /*在createElement上检验需要过滤的标签*/
        var raw_create_fn = window.Document.prototype.createElement;
        window.Document.prototype.createElement = function(){
            return resetS.call(raw_create_fn.apply(this, arguments));
        }
        function resetS(){
            // 为脚本元素安装属性钩子
            if (getTag(this.tagName)){
                this.__defineSetter__('src', function(url){
                    this.setAttribute('src',url);
                });
                this.__defineSetter__('href', function(url){
                    this.setAttribute('href',url);
                });
            }
            // 返回元素实例
            return this;
        }

        window.Object.defineProperty(window.Function.prototype, 'call', {
            value: window.Function.prototype.call,
            writable: false,
            configurable: false,
            enumerable: true
        });
        window.Object.defineProperty(Function.prototype, 'apply', {
            value: Function.prototype.apply,
            writable: false,
            configurable: false,
            enumerable: true
        });

        /*监听DOMNodeInserted事件*/
        window.document.addEventListener('DOMNodeInserted', function(e){
            var target = e.target;
            if(target.nodeType!=1){return}
            // 给框架里环境也装个钩子
            if(target.tagName == 'IFRAME'){
                xssPro(target.contentWindow);
            }
            if(!(matchAccept(target.src) && matchAccept(target.href))){
                target.parentNode.removeChild(target);
                intercept(target.outerHTML);
            }else if(target.tagName != 'SCRIPT'){
                for(var j=0,k=tags.length;j<k;j++){
                    if(tags[j]=='a'){
                        tagEach(target.getElementsByTagName(tags[j]),'href')
                    }else{
                        tagEach(target.getElementsByTagName(tags[j]),'src')
                    }
                }
            }
        }, true);

        /*后代元素逐个扫描*/
        function tagEach(list,type){
            var i=0,l=list.length,text='';
            for(;i<l;i++){
                if(!(matchAccept(list[i].src) && matchAccept(list[i].href))){
                    intercept((list[i].src?list[i].src:list[i].href));
                    list[i].parentNode.removeChild(list[i]);
                }
            }
        }

        /*为已有标签添加监控*/
        window.onload=function(){
            var i=0,l=tags.length,j=0,k=0;
            for(;i<l;i++){
                var els = window.document.getElementsByTagName(tags[i]);
                for(j=0,k=els.length;j<k;j++){
                    resetS.call(els[j]);
                }
            }
        }
    }

    /*监听元素变化*/
    var observer = new MutationObserver(function(mutations){
        mutations.forEach(function(mutation){
            var nodes = mutation.addedNodes,i = 0,l = nodes.length;
            for(; i < l; i++){
                var node = nodes[i];
                if(node.nodeType != 1){continue}
                if(!(matchAccept(node.src) && matchAccept(node.href))){
                    node.parentNode.removeChild(node);
                    intercept(node.outerHTML);
                }
            }
        });
    });

    observer.observe(document, {
        subtree: true,
        childList: true
    });
    xssPro(window);
}(window);
